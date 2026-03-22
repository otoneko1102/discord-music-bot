import 'dotenv/config';
import fs from 'fs';
import path from 'path';

interface RawConfig {
  prefix: string;
  servers: {
    mode: 'all' | 'whitelist' | 'blacklist';
    list: string[];
  };
  lofi: {
    url: string;
  };
  inviteUrl: string;
  repoUrl: string;
  defaultLanguage: string;
  defaultVolume: number;
  maxQueueSize: number;
  maxPlaylistSize: number;
  searchResultCount: number;
}

// Minimal JSONC parser — strips // line comments and /* */ block comments
// while correctly ignoring comment-like sequences inside string literals.
function parseJsonc(text: string): RawConfig {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    // String literal — copy verbatim, respecting escape sequences
    if (ch === '"') {
      out += ch;
      i++;
      while (i < text.length) {
        const sc = text[i];
        out += sc;
        i++;
        if (sc === '\\') {
          out += text[i++];
        } // escaped char
        else if (sc === '"') break; // end of string
      }
      // Single-line comment
    } else if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      // Block comment
    } else if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
    } else {
      out += ch;
      i++;
    }
  }
  return JSON.parse(out) as RawConfig;
}

const configPath = path.join(__dirname, '..', 'config.jsonc');
const raw = parseJsonc(fs.readFileSync(configPath, 'utf8'));

const config = {
  ...raw,
  token: process.env.DISCORD_TOKEN ?? '',
  clientId: process.env.CLIENT_ID ?? '',
  devGuildId: process.env.DEV_GUILD_ID ?? null,
} as const;

export default config;
