import { EmbedBuilder } from 'discord.js';
import type { Track } from '../types';
import type MusicPlayer from '../core/MusicPlayer';

export const COLOR_PRIMARY = 0x5865f2;
export const COLOR_SUCCESS = 0x57f287;
export const COLOR_ERROR = 0xed4245;
export const COLOR_WARNING = 0xfee75c;
export const COLOR_MUSIC = 0x1db954;

export function successEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLOR_SUCCESS).setDescription(`✅ ${description}`);
}

export function errorEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLOR_ERROR).setDescription(`❌ ${description}`);
}

export function warningEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLOR_WARNING).setDescription(`⚠️ ${description}`);
}

export function infoEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLOR_PRIMARY).setDescription(`ℹ️ ${description}`);
}

export function loadingEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLOR_PRIMARY).setDescription(`⏳ ${description}`);
}

type TranslateFn = (key: string, ...args: (string | number)[]) => string;

function buildProgressBar(position: number, duration: number): string {
  const pct = Math.min(Math.floor((position / duration) * 100), 100);
  const filled = Math.round(pct / 5); // 20 chars wide
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  return `\`${bar}\` ${pct}%\n${formatDuration(position)} / ${formatDuration(duration)}`;
}

export function nowPlayingEmbed(track: Track, player: MusicPlayer, t: TranslateFn): EmbedBuilder {
  const durationStr = track.isLive
    ? t('duration.live')
    : track.duration
      ? formatDuration(track.duration)
      : t('duration.unknown');

  const loopStr =
    player.loopMode === 'track'
      ? t('queue.loopTrack')
      : player.loopMode === 'queue'
        ? t('queue.loopQueue')
        : t('queue.loopOff');

  let description = `**[${track.title}](${track.url})**`;
  if (!track.isLive && track.duration > 0) {
    description += `\n\n${buildProgressBar(player.position, track.duration)}`;
  }

  const embed = new EmbedBuilder()
    .setColor(COLOR_MUSIC)
    .setTitle(t('nowplaying.title'))
    .setDescription(description)
    .setThumbnail(track.thumbnail)
    .addFields(
      { name: t('nowplaying.duration'), value: durationStr, inline: true },
      { name: t('nowplaying.requestedBy'), value: `<@${track.requesterId}>`, inline: true },
      { name: t('nowplaying.volume'), value: `${player.volume}%`, inline: true },
      { name: t('nowplaying.loop'), value: loopStr, inline: true },
      { name: t('nowplaying.autoplay'), value: player.autoplay ? '✅' : '❌', inline: true },
      { name: t('nowplaying.source'), value: capitalize(track.source), inline: true }
    );

  if (track.uploader) {
    embed.setAuthor({ name: track.uploader, url: track.uploaderUrl ?? undefined });
  }

  return embed;
}

export function nowPlayingNextEmbed(track: Track, t: TranslateFn): EmbedBuilder {
  const dur = track.isLive
    ? t('duration.live')
    : track.duration
      ? formatDuration(track.duration)
      : t('duration.unknown');

  return new EmbedBuilder()
    .setColor(COLOR_MUSIC)
    .setTitle(t('play.nowPlayingNext'))
    .setDescription(`**[${track.title}](${track.url})**`)
    .setThumbnail(track.thumbnail)
    .addFields(
      { name: t('nowplaying.duration'), value: dur, inline: true },
      { name: t('nowplaying.requestedBy'), value: `<@${track.requesterId}>`, inline: true },
      { name: t('nowplaying.source'), value: capitalize(track.source), inline: true }
    );
}

export function addedToQueueEmbed(track: Track, position: number, t: TranslateFn): EmbedBuilder {
  const dur = track.isLive
    ? t('duration.live')
    : track.duration
      ? formatDuration(track.duration)
      : t('duration.unknown');

  return new EmbedBuilder()
    .setColor(COLOR_PRIMARY)
    .setTitle(t('play.addedToQueue'))
    .setDescription(`**[${track.title}](${track.url})**`)
    .setThumbnail(track.thumbnail)
    .addFields(
      { name: t('nowplaying.duration'), value: dur, inline: true },
      { name: t('nowplaying.requestedBy'), value: `<@${track.requesterId}>`, inline: true },
      { name: 'Position', value: `#${position}`, inline: true }
    );
}

export function queueEmbed(
  upcomingTracks: Track[],
  currentTrack: Track | null,
  page: number,
  totalPages: number,
  totalCount: number,
  t: TranslateFn
): EmbedBuilder {
  const pageSize = 10;
  const start = (page - 1) * pageSize;
  const entries = upcomingTracks.slice(start, start + pageSize);

  const lines = entries.map((track, i) => {
    const pos = start + i + 1;
    const dur = track.isLive
      ? t('duration.live')
      : track.duration
        ? formatDuration(track.duration)
        : '?';
    const isHttpUrl = track.url?.startsWith('http');
    const titlePart = isHttpUrl
      ? `[${escapeMarkdown(track.title)}](${track.url})`
      : escapeMarkdown(track.title);
    return `\`${pos}.\` ${titlePart} \`[${dur}]\` — <@${track.requesterId}>`;
  });

  const embed = new EmbedBuilder()
    .setColor(COLOR_PRIMARY)
    .setTitle(t('queue.title'))
    .setFooter({
      text: `${t('queue.page', page, totalPages)} • ${t('queue.trackCount', totalCount)}`,
    });

  if (currentTrack) {
    const dur = currentTrack.isLive
      ? t('duration.live')
      : currentTrack.duration
        ? formatDuration(currentTrack.duration)
        : '?';
    const isHttpUrl = currentTrack.url?.startsWith('http');
    const currentTitlePart = isHttpUrl
      ? `[${escapeMarkdown(currentTrack.title)}](${currentTrack.url})`
      : escapeMarkdown(currentTrack.title);
    embed.addFields({
      name: `▶ ${t('queue.nowPlaying')}`,
      value: `${currentTitlePart} \`[${dur}]\``,
    });
  }

  embed.addFields({
    name: t('queue.upNext'),
    value: lines.length > 0 ? lines.join('\n') : t('queue.empty'),
  });

  return embed;
}

export function vcJoinedEmbed(channelName: string, t: TranslateFn): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setDescription(`🔊 ${t('vc.joined', channelName)}`);
}

export function vcDisconnectedEmbed(channelName: string, t: TranslateFn): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLOR_ERROR)
    .setDescription(`🔇 ${t('vc.disconnected', channelName)}`);
}

export function vcMovedEmbed(channelName: string, t: TranslateFn): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLOR_PRIMARY)
    .setDescription(`🔀 ${t('vc.moved', channelName)}`);
}

export function queueEmptyEmbed(t: TranslateFn): EmbedBuilder {
  return new EmbedBuilder().setColor(COLOR_WARNING).setDescription(`📭 ${t('vc.queueEmpty')}`);
}

export function searchEmbed(results: Track[], t: TranslateFn): EmbedBuilder {
  const lines = results.map((r, i) => {
    const dur = r.isLive ? t('duration.live') : r.duration ? formatDuration(r.duration) : '?';
    return `\`${i + 1}.\` [${escapeMarkdown(r.title)}](${r.url}) \`[${dur}]\``;
  });

  return new EmbedBuilder()
    .setColor(COLOR_PRIMARY)
    .setTitle(t('play.selectSong'))
    .setDescription(lines.join('\n'))
    .setFooter({ text: 'Reply with a number (1-5) to select, or "cancel" to cancel. (30s)' });
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeMarkdown(text: string): string {
  return text.replace(/[[\]()_*~`|\\]/g, '\\$&');
}
