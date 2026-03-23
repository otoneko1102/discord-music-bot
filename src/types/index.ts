import type {
  Guild,
  GuildMember,
  TextChannel,
  NewsChannel,
  VoiceChannel,
  StageChannel,
  Message,
  User,
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  InteractionEditReplyOptions,
  MessageCreateOptions,
  MessagePayload,
} from 'discord.js';
import type MusicPlayer from '../core/MusicPlayer';
import type GuildManagerClass from '../core/GuildManager';

// Track

export type TrackSource = 'youtube' | 'spotify' | 'soundcloud' | 'url' | 'system';

export interface Track {
  title: string;
  url: string;
  /** Duration in seconds. 0 for live streams. */
  duration: number;
  thumbnail: string | null;
  uploader: string | null;
  uploaderUrl: string | null;
  isLive: boolean;
  source: TrackSource;
  requesterId: string;
  /** If set, the track URL is not yet resolved. This query will be searched on YouTube just before playback. */
  pendingQuery?: string;
}

// Guild Settings

export type Language = 'en' | 'ja';

export type RoleFilterMode = 'all' | 'whitelist' | 'blacklist';

export interface GuildSettings {
  prefix: string;
  language: Language;
  volume: number;
  stay247: boolean;
  lofi: boolean;
  musicChannelId: string | null;
  voiceChannelId: string | null;
  roleMode: RoleFilterMode;
  roleList: string[];
  masterRoles: string[];
}

// Command

export type CommandCategory =
  | 'playback'
  | 'track-state'
  | 'queue'
  | 'special'
  | 'information'
  | 'settings';

/** Unified context passed to every command handler */
export interface CommandContext {
  isSlash: boolean;
  guildId: string;
  guild: Guild;
  member: GuildMember;
  channel: TextChannel | NewsChannel;
  voiceChannel: VoiceChannel | StageChannel | null;

  /** Send a reply (works for both text and slash commands) */
  reply: (
    content: string | MessagePayload | MessageCreateOptions | InteractionReplyOptions
  ) => Promise<Message | void>;

  /** Defer the reply for slash commands (noop for text commands) */
  deferReply: () => Promise<void>;

  /** Edit the original reply */
  editReply: (
    content: string | MessagePayload | InteractionEditReplyOptions
  ) => Promise<Message | void>;

  /** Send a follow-up message */
  followUp: (
    content: string | MessagePayload | MessageCreateOptions | InteractionReplyOptions
  ) => Promise<Message | void>;

  /** Raw text args (text command only) */
  args: string[];

  /** Get a slash command string option (null for text commands unless using args) */
  getString: (name: string, required?: false) => string | null;
  getInteger: (name: string, required?: false) => number | null;
  getBoolean: (name: string, required?: false) => boolean | null;
  getUser: (name: string, required?: false) => User | null;

  /** Original interaction (slash command only) */
  interaction: ChatInputCommandInteraction | null;
  /** Original message (text command only) */
  message: Message | null;

  /** The music player for this guild */
  player: MusicPlayer;
  /** Guild settings manager (singleton) */
  guildManager: typeof GuildManagerClass;
  /** Bound translation function */
  t: (key: string, ...args: (string | number)[]) => string;
}

export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  descriptionJa?: string;
  category: CommandCategory;
  usage?: string;
  /** Whether to register as slash command */
  slashCommand?: boolean;
  /** If true, requires Administrator, Manage Guild, or a master role to use */
  requiresAdmin?: boolean;
  execute: (ctx: CommandContext) => Promise<void>;
}

// Spotify Embed Types

export interface SpotifyEmbedTrack {
  title: string;
  subtitle?: string; // artist(s)
  uri: string;
  duration: number; // ms
  isPlayable?: boolean;
  audioPreview?: { url: string };
  artists?: { name: string; uri: string }[];
}

export interface SpotifyEmbedEntity {
  type: 'track' | 'album' | 'playlist' | 'show' | 'episode';
  name: string;
  uri: string;
  id: string;
  // Track fields
  title?: string;
  artists?: { name: string; uri: string }[];
  duration?: number; // ms
  // Playlist/Album fields
  trackList?: SpotifyEmbedTrack[];
  images?: { url: string }[];
}

// Misc

export type LoopMode = 'off' | 'track' | 'queue';

export interface ResolveResult {
  tracks: Track[];
  playlistTitle?: string;
  totalCount?: number;
}
