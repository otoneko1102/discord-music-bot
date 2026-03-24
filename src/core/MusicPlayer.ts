import {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
  entersState,
  type AudioPlayer,
  type VoiceConnection,
} from '@discordjs/voice';
import {
  MessageFlags,
  type TextChannel,
  type NewsChannel,
  type VoiceChannel,
  type StageChannel,
} from 'discord.js';
import ffmpegPath from 'ffmpeg-static';
import { ytdlp, resolveQueryFirst } from '../utils/search';
import {
  nowPlayingNextEmbed,
  vcJoinedEmbed,
  vcDisconnectedEmbed,
  vcMovedEmbed,
  queueEmptyEmbed,
} from '../utils/embeds';
import { createTranslator } from '../utils/i18n';
import Queue from './Queue';
import config from '../config';
import guildManager from './GuildManager';
import { saveQueueState, clearQueueState } from '../utils/queuePersistence';
import type { Track, LoopMode } from '../types';
import type { Stream } from 'ytdlp-nodejs';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
/** Skip a track after this many consecutive audio errors to prevent infinite error loops. */
const MAX_CONSECUTIVE_ERRORS = 3;

export default class MusicPlayer {
  readonly guildId: string;
  readonly queue: Queue;
  readonly audioPlayer: AudioPlayer;
  voiceConnection: VoiceConnection | null = null;
  textChannel: TextChannel | NewsChannel | null = null;

  private _volume = config.defaultVolume ?? 100;
  private _guild: (VoiceChannel | StageChannel)['guild'] | null = null;
  private _lofiMode = false;
  private _stay247 = false;
  private _currentStreamBuilder: Stream | null = null;
  private _stopping = false;
  private _idleTimer: ReturnType<typeof setTimeout> | null = null;
  private _trackStartTime = 0;
  private _seekOffset = 0;
  private _consecutiveErrors = 0;

  constructor(guildId: string, initialVolume?: number) {
    this.guildId = guildId;
    this.queue = new Queue();
    this.audioPlayer = createAudioPlayer();
    if (initialVolume !== undefined) this._volume = Math.max(0, Math.min(100, initialVolume));
    this._setupPlayer();
  }

  get volume(): number {
    return this._volume;
  }
  get loopMode(): LoopMode {
    return this.queue.loopMode;
  }
  set loopMode(v: LoopMode) {
    this.queue.loopMode = v;
  }
  get autoplay(): boolean {
    return this.queue.autoplay;
  }
  set autoplay(v: boolean) {
    this.queue.autoplay = v;
  }
  get lofiMode(): boolean {
    return this._lofiMode;
  }
  get stay247(): boolean {
    return this._stay247;
  }
  set stay247(v: boolean) {
    this._stay247 = v;
  }

  get isPlaying(): boolean {
    return this.audioPlayer.state.status === AudioPlayerStatus.Playing;
  }
  get isPaused(): boolean {
    return this.audioPlayer.state.status === AudioPlayerStatus.Paused;
  }
  get isIdle(): boolean {
    return this.audioPlayer.state.status === AudioPlayerStatus.Idle;
  }
  get isConnected(): boolean {
    return (
      this.voiceConnection !== null &&
      this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed
    );
  }

  /** Elapsed seconds since track start (includes seek offset). */
  get position(): number {
    if (!this._trackStartTime) return 0;
    return Math.floor((Date.now() - this._trackStartTime) / 1000) + this._seekOffset;
  }

  async join(channel: VoiceChannel | StageChannel, notify = true): Promise<void> {
    if (
      this.voiceConnection &&
      this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed &&
      this.voiceConnection.joinConfig.channelId === channel.id
    )
      return;

    const isMove =
      this.voiceConnection !== null &&
      this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed;

    this.voiceConnection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    this._guild = channel.guild;
    guildManager.set(this.guildId, { voiceChannelId: channel.id });
    this.voiceConnection.subscribe(this.audioPlayer);

    this.voiceConnection.on('error', err => {
      console.error(`[Player:${this.guildId}] Voice error:`, err);
    });

    this.voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.voiceConnection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.voiceConnection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        if (!this._stay247) this.destroy();
      }
    });

    await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 30_000);

    if (notify) {
      const lang = guildManager.getLanguage(this.guildId);
      const t = createTranslator(lang);
      const embed = isMove ? vcMovedEmbed(channel.name, t) : vcJoinedEmbed(channel.name, t);
      this._notify(embed).catch(() => {});
    }
  }

  disconnect(notify = true): void {
    this._stopStream();
    this.queue.clear();
    this.queue.history.length = 0;
    this._lofiMode = false;

    const channelId = this.voiceConnection?.joinConfig.channelId;
    const channelName =
      channelId && this._guild ? (this._guild.channels.cache.get(channelId)?.name ?? null) : null;

    if (
      this.voiceConnection &&
      this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed
    ) {
      this.voiceConnection.destroy();
    }
    this.voiceConnection = null;
    this._clearIdleTimer();
    this._stopping = true;
    this.audioPlayer.stop(true);
    guildManager.set(this.guildId, { voiceChannelId: null });
    clearQueueState(this.guildId);

    if (notify && channelName) {
      const lang = guildManager.getLanguage(this.guildId);
      const t = createTranslator(lang);
      this._notify(vcDisconnectedEmbed(channelName, t)).catch(() => {});
    }
  }

  destroy(): void {
    this.disconnect();
  }

  private _setupPlayer(): void {
    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this._trackStartTime = 0;
      this._seekOffset = 0;
      if (this._stopping) {
        this._stopping = false;
        return;
      }
      void this._onTrackEnd();
    });

    this.audioPlayer.on('error', err => {
      console.error(`[Player:${this.guildId}] Audio error:`, err.message);
      this._consecutiveErrors++;
      // Set _stopping so the subsequent Idle event doesn't double-fire _onTrackEnd.
      // The Idle event always fires synchronously after the error event in @discordjs/voice,
      // before any microtasks, so _stopping will be seen by the Idle handler.
      this._stopping = true;

      if (this._consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.warn(
          `[Player:${this.guildId}] ${MAX_CONSECUTIVE_ERRORS} consecutive errors — skipping track.`,
        );
        this._consecutiveErrors = 0;
      }
      void this._onTrackEnd();
    });
  }

  private async _onTrackEnd(): Promise<void> {
    if (this._lofiMode) {
      await this._playLofi();
      return;
    }

    const next = this.queue.advance();

    if (!next) {
      if (this.queue.autoplay) {
        await this._handleAutoplay();
      } else {
        const lang = guildManager.getLanguage(this.guildId);
        const t = createTranslator(lang);
        this._notify(queueEmptyEmbed(t)).catch(() => {});
        this._startIdleTimer();
      }
      return;
    }

    if (!next.pendingQuery) {
      this._sendAutoAdvanceNotification(next).catch(() => {});
    }
    await this._playTrack(next);
  }

  async _playTrack(track: Track, seekSeconds = 0): Promise<void> {
    this._stopStream();
    this._clearIdleTimer();

    if (track.pendingQuery) {
      try {
        const resolved = await resolveQueryFirst(track.pendingQuery, track.requesterId);
        if (resolved) {
          track.url = resolved.url;
          if (!track.thumbnail) track.thumbnail = resolved.thumbnail;
          if (!track.duration) track.duration = resolved.duration;
        }
        delete track.pendingQuery;
      } catch {
        delete track.pendingQuery;
      }
      if (!track.url) {
        setTimeout(() => void this._onTrackEnd(), 500);
        return;
      }
      this._sendAutoAdvanceNotification(track).catch(() => {});
    }

    try {
      const builder = ytdlp
        .stream(track.url)
        .filter('audioonly')
        .quality(0)
        .setFfmpegPath(ffmpegPath ?? '');

      if (seekSeconds > 0) {
        builder.addArgs('--download-sections', `*${seekSeconds}-inf`);
      }

      this._currentStreamBuilder = builder;
      const passThrough = builder.getStream();

      const resource = createAudioResource(passThrough, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });

      resource.volume?.setVolumeLogarithmic(this._volume / 100);

      this._trackStartTime = Date.now();
      this._seekOffset = seekSeconds;
      this._consecutiveErrors = 0;
      this.audioPlayer.play(resource);
      this._persistQueueState();
    } catch (err) {
      console.error(`[Player:${this.guildId}] Error starting track "${track.title}":`, err);
      setTimeout(() => void this._onTrackEnd(), 1000);
    }
  }

  private async _playLofi(): Promise<void> {
    const lofiUrl = config.lofi?.url;
    if (!lofiUrl) return;

    const lofiTrack: Track = {
      title: 'Lofi Hip Hop Radio',
      url: lofiUrl,
      duration: 0,
      isLive: true,
      source: 'system',
      requesterId: 'system',
      thumbnail: null,
      uploader: null,
      uploaderUrl: null,
    };

    this.queue.history.push(lofiTrack);
    await this._playTrack(lofiTrack);
  }

  private async _handleAutoplay(): Promise<void> {
    const last = this.queue.getCurrent();
    if (!last) {
      this._startIdleTimer();
      return;
    }

    try {
      const query = `${last.title} mix`;
      const track = await resolveQueryFirst(query, 'autoplay');
      if (track) {
        this.queue.add(track);
        const next = this.queue.advance();
        if (next) await this._playTrack(next);
      } else {
        this._startIdleTimer();
      }
    } catch {
      this._startIdleTimer();
    }
  }

  private async _notify(embed: import('discord.js').EmbedBuilder): Promise<void> {
    const musicChannelId = guildManager.getMusicChannelId(this.guildId);
    const channel =
      (musicChannelId && this._guild
        ? (this._guild.channels.cache.get(musicChannelId) as TextChannel | NewsChannel | null)
        : null) ?? this.textChannel;
    if (!channel) return;
    await channel.send({ embeds: [embed], flags: MessageFlags.SuppressNotifications });
  }

  private async _sendAutoAdvanceNotification(track: Track): Promise<void> {
    const musicChannelId = guildManager.getMusicChannelId(this.guildId);
    const channel =
      (musicChannelId && this._guild
        ? (this._guild.channels.cache.get(musicChannelId) as TextChannel | NewsChannel | null)
        : null) ?? this.textChannel;

    if (!channel) return;

    const lang = guildManager.getLanguage(this.guildId);
    const t = createTranslator(lang);
    await channel.send({
      embeds: [nowPlayingNextEmbed(track, t)],
      flags: MessageFlags.SuppressNotifications,
    });
  }

  private _stopStream(): void {
    if (this._currentStreamBuilder) {
      try {
        this._currentStreamBuilder.kill();
      } catch {
        /* ignore */
      }
      this._currentStreamBuilder = null;
    }
  }

  /** Persist current queue state to disk for crash recovery. */
  private _persistQueueState(): void {
    const voiceChannelId = this.voiceConnection?.joinConfig.channelId;
    if (!voiceChannelId) return;

    saveQueueState(this.guildId, {
      isLofi: this._lofiMode,
      tracks: [...this.queue.tracks],
      currentTrack: this.queue.getCurrent(),
      loopMode: this.queue.loopMode,
      autoplay: this.queue.autoplay,
      volume: this._volume,
      voiceChannelId,
      textChannelId: this.textChannel?.id ?? null,
      savedAt: Date.now(),
    });
  }

  /** Public: persist state after external queue modifications (remove, shuffle, etc.). */
  persistQueueState(): void {
    this._persistQueueState();
  }

  /** Add a track and start playing if idle. */
  async enqueue(track: Track): Promise<'playing' | 'queued'> {
    if (!this.isConnected) throw new Error('Not connected to a voice channel');

    const wasIdle = this.isIdle && this.queue.isEmpty();

    if (wasIdle) {
      this.queue.history.push(track);
      await this._playTrack(track);
      return 'playing';
    } else {
      this.queue.add(track);
      this._persistQueueState();
      return 'queued';
    }
  }

  /** Add multiple tracks to queue. */
  async enqueueMany(tracks: Track[]): Promise<void> {
    if (!this.isConnected) throw new Error('Not connected to a voice channel');
    if (tracks.length === 0) return;

    const wasIdle = this.isIdle && this.queue.isEmpty();

    if (wasIdle) {
      const [first, ...rest] = tracks;
      this.queue.add(rest);
      this.queue.history.push(first!);
      await this._playTrack(first!);
    } else {
      this.queue.add(tracks);
      this._persistQueueState();
    }
  }

  pause(): boolean {
    if (this.isPaused) return false;
    return this.audioPlayer.pause();
  }

  resume(): boolean {
    if (!this.isPaused) return false;
    return this.audioPlayer.unpause();
  }

  stop(): void {
    this._stopStream();
    this.queue.clear();
    this.queue.history.length = 0;
    this._lofiMode = false;
    this._stopping = true;
    this.audioPlayer.stop(true);
    clearQueueState(this.guildId);
  }

  async skip(): Promise<void> {
    this._stopStream();
    this.audioPlayer.stop(true);
    // Idle event triggers _onTrackEnd → _playTrack
  }

  async previous(): Promise<Track | null> {
    const prev = this.queue.rewind();
    if (!prev) return null;
    this._stopping = true;
    this._stopStream();
    this.audioPlayer.stop(true);
    await this._playTrack(prev);
    return prev;
  }

  async seek(seconds: number): Promise<boolean> {
    const current = this.queue.getCurrent();
    if (!current) return false;
    this._stopping = true;
    this._stopStream();
    this.queue.history.push(current);
    await this._playTrack(current, seconds);
    return true;
  }

  setVolume(vol: number): void {
    this._volume = Math.max(0, Math.min(100, vol));
    const state = this.audioPlayer.state;
    if (state.status !== AudioPlayerStatus.Idle && 'resource' in state) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state as any).resource?.volume?.setVolumeLogarithmic(this._volume / 100);
    }
  }

  async skipTo(position: number): Promise<Track | null> {
    const track = this.queue.skipTo(position);
    if (!track) return null;
    this._stopping = true;
    this._stopStream();
    this.audioPlayer.stop(true);
    await this._playTrack(track);
    return track;
  }

  async replay(): Promise<boolean> {
    const current = this.queue.getCurrent();
    if (!current) return false;
    this.queue.history.push(current);
    this._stopping = true;
    this._stopStream();
    this.audioPlayer.stop(true);
    await this._playTrack(current);
    return true;
  }

  async setLofi(enabled: boolean): Promise<void> {
    this._lofiMode = enabled;
    if (enabled) {
      this.queue.clear();
      this._stopStream();
      if (!this.isIdle) this._stopping = true;
      this.audioPlayer.stop(true);
      await this._playLofi();
    } else {
      this._stopStream();
      if (!this.isIdle) this._stopping = true;
      this.audioPlayer.stop(true);
      this._persistQueueState();
    }
  }

  private _startIdleTimer(): void {
    if (this._stay247) return;
    this._clearIdleTimer();
    this._idleTimer = setTimeout(() => this.destroy(), IDLE_TIMEOUT_MS);
  }

  private _clearIdleTimer(): void {
    if (this._idleTimer) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  }
}
