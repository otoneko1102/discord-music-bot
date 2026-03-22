import fs from 'fs';
import path from 'path';
import config from '../config';
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
  };
}

class GuildManager {
  private _data: Record<string, GuildSettings> = {};

  constructor() {
    this._load();
  }

  private _load(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      if (fs.existsSync(SETTINGS_FILE)) {
        this._data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) as Record<
          string,
          GuildSettings
        >;
      }
    } catch (err) {
      console.error('[GuildManager] Failed to load settings, starting fresh:', err);
      this._data = {};
    }
  }

  private _write(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this._data, null, 2));
    } catch (err) {
      console.error('[GuildManager] Failed to save settings:', err);
    }
  }

  get(guildId: string): GuildSettings {
    if (!this._data[guildId]) this._data[guildId] = makeDefault();
    return { ...makeDefault(), ...this._data[guildId] };
  }

  set(guildId: string, updates: Partial<GuildSettings>): void {
    this._data[guildId] = { ...this.get(guildId), ...updates };
    this._write();
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
