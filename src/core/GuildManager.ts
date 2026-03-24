import path from 'path';
import config from '../config';
import { atomicWriteJSON, safeReadJSON } from '../utils/safeFileIO';
import type { GuildSettings, Language } from '../types';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'guild-settings.json');

function makeDefault(): GuildSettings {
  return {
    prefix: config.prefix || '.',
    language: (config.defaultLanguage as Language) || 'en',
    volume: config.defaultVolume ?? 70,
    stay247: false,
    lofi: false,
    musicChannelId: null,
    voiceChannelId: null,
    roleMode: 'all',
    roleList: [],
    masterRoles: [],
  };
}

class GuildManager {
  private _data: Record<string, GuildSettings> = {};
  private _writeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this._load();
  }

  private _load(): void {
    this._data = safeReadJSON<Record<string, GuildSettings>>(SETTINGS_FILE, {});
  }

  private _scheduleWrite(): void {
    // Debounce: coalesce rapid successive writes (e.g. bulk settings updates) into one.
    if (this._writeTimer) clearTimeout(this._writeTimer);
    this._writeTimer = setTimeout(() => {
      this._writeTimer = null;
      this._flush();
    }, 300);
  }

  private _flush(): void {
    try {
      atomicWriteJSON(SETTINGS_FILE, this._data);
    } catch (err) {
      console.error('[GuildManager] Failed to save settings:', err);
    }
  }

  /** Flush any pending debounced write immediately (call on process exit). */
  flushSync(): void {
    if (this._writeTimer) {
      clearTimeout(this._writeTimer);
      this._writeTimer = null;
      this._flush();
    }
  }

  get(guildId: string): GuildSettings {
    if (!this._data[guildId]) this._data[guildId] = makeDefault();
    return { ...makeDefault(), ...this._data[guildId] };
  }

  set(guildId: string, updates: Partial<GuildSettings>): void {
    this._data[guildId] = { ...this.get(guildId), ...updates };
    this._scheduleWrite();
  }

  getPrefix(guildId: string): string {
    return this.get(guildId).prefix;
  }
  getLanguage(guildId: string): Language {
    return this.get(guildId).language;
  }
  getVolume(guildId: string): number {
    return this.get(guildId).volume ?? config.defaultVolume ?? 70;
  }
  getMusicChannelId(guildId: string): string | null {
    return this.get(guildId).musicChannelId ?? null;
  }
}

export default new GuildManager();
