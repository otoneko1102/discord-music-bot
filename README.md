# 🎵 Discord Music Bot

[日本語版はこちら](README-ja.md)

[![Node.js](https://img.shields.io/badge/Node.js-18.x%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org)
[![yt-dlp](https://img.shields.io/badge/yt--dlp-powered-FF0000?logo=youtube&logoColor=white)](https://github.com/yt-dlp/yt-dlp)
[![License: MIT](https://img.shields.io/badge/License-MIT-F7DF1E?logo=opensourceinitiative&logoColor=black)](LICENSE)

A feature-rich Discord music bot built with **discord.js v14**, **ytdlp-nodejs**, and **TypeScript**.

## ✨ Features

| Feature | Description |
|---|---|
| 🎵 Multi-source playback | YouTube, YouTube Music, SoundCloud, Spotify (track / album / playlist URLs) |
| 🔍 Search | YouTube keyword search with interactive button selection |
| 🔁 Loop modes | Loop the current track or the entire queue |
| 🔀 Shuffle | Shuffle / unshuffle the queue |
| ♾ Autoplay | Plays related songs automatically when the queue ends |
| ☕ Lofi mode | Streams lofi hip hop radio continuously (toggle on/off) |
| 🕐 24/7 mode | Bot stays in voice channel even when everyone leaves |
| 🌐 Multilingual | English and Japanese (per-server) |
| 🎚 Volume control | 0–100% with logarithmic scaling (default: 70%) |
| ⚙️ Per-server config | Custom prefix and language per server |
| 🔒 Server list | Allow or block specific servers via whitelist / blacklist |
| 📢 Music channel | Designate a channel where no prefix is needed — send commands or URLs directly |
| `/` Slash commands | Full slash command support alongside prefix commands |
| `@` Mention | Use the bot by mentioning it instead of typing the prefix |

> **Audio sources:**
> - **YouTube / YouTube Music / SoundCloud** — audio streamed directly via yt-dlp.
> - **Spotify** — metadata fetched from the Spotify embed page; audio resolved via YouTube search and streamed through yt-dlp. No Spotify API credentials required. Keyword search is YouTube only; paste a `open.spotify.com` URL (track, album, or playlist) to play Spotify content.

---

## 📦 Requirements

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A Discord bot token — [Discord Developer Portal](https://discord.com/developers/applications)
- FFmpeg is bundled via `ffmpeg-static`; yt-dlp is auto-managed by `ytdlp-nodejs`

---

## 🚀 Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

```env
# Required
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_client_id

# Optional – register slash commands to a specific guild instantly (dev only)
# DEV_GUILD_ID=your_guild_id
```

| Setting | Required | Purpose |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot login |
| `CLIENT_ID` | ✅ | Slash command registration |
| `DEV_GUILD_ID` | — | Instant slash command registration in dev |

### 3. Bot configuration

Copy `config.jsonc.example` to `config.jsonc` and edit as needed:

```bash
cp config.jsonc.example config.jsonc
```

Edit `config.jsonc`:

```jsonc
{
  // Default command prefix. Admins can change it per server with the prefix command.
  "prefix": ".",
  "servers": {
    // "all" | "whitelist" | "blacklist"
    "mode": "all",
    "list": []
  },
  "lofi": {
    "url": "https://www.youtube.com/watch?v=jfKfPfyJRdk"
  },
  "defaultLanguage": "en",
  "defaultVolume": 70,
  "maxQueueSize": 500,
  "maxPlaylistSize": 100,
  "searchResultCount": 5
}
```

**Server access modes:**

| `mode` | Behavior |
|---|---|
| `"all"` | Allow all servers (default) |
| `"whitelist"` | Only servers listed in `list` |
| `"blacklist"` | Block servers listed in `list` |

### 4. Discord bot settings (Developer Portal)

In the [Developer Portal](https://discord.com/developers/applications) → **Bot** tab, enable:
- ✅ **Message Content Intent**

Bot invite requires the following permissions:
- Text: View Channels, Send Messages, Embed Links, Read Message History
- Voice: Connect, Speak, Use Voice Activity

Invite URL scopes: `bot` + `applications.commands`

### 5. Run

```bash
# Development (auto-reload)
npm run dev

# Production
npm run build && npm start
```

---

## 🎮 Commands

Default prefix: **`.`** — configurable per server with `.prefix <new>`

You can also use **slash commands** (`/play`) or **mention** the bot (`@Bot play`).

---

### 🎵 Playback

| Command | Aliases | Description | Usage |
|---|---|---|---|
| `play` | `p` | Play a song / playlist from YouTube, Spotify URL, or keyword search | `.play <query or URL>` |
| `pause` | `pa` | Pause playback | `.pause` |
| `resume` | `r`, `continue` | Resume playback | `.resume` |
| `stop` | `st`, `stp` | Stop and clear the queue | `.stop` |
| `skip` | `s`, `next`, `sk` | Skip the current song | `.skip [amount]` |
| `previous` | `prev`, `back`, `pr` | Play the previous song | `.previous` |
| `seek` | `se` | Seek to a position | `.seek <1:30 \| 90>` |
| `volume` | `vol`, `v` | View or set volume (0–100) | `.volume [0-100]` |
| `join` | `j`, `summon`, `connect` | Join your voice channel | `.join` |
| `disconnect` | `dc`, `leave`, `bye` | Disconnect from voice | `.disconnect` |
| `replay` | `rp`, `restart` | Replay the current song from the start | `.replay` |

**Examples:**
```
.play lofi hip hop                                              ← YouTube search
.play https://youtu.be/dQw4w9WgXcQ                             ← YouTube URL
.play https://www.youtube.com/playlist?list=PLxxxxx            ← YouTube playlist
.play https://music.youtube.com/watch?v=...                    ← YouTube Music
.play https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT   ← Spotify track
.play https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M ← Spotify playlist
.play https://soundcloud.com/artist/track                      ← SoundCloud track
.play https://soundcloud.com/artist/sets/playlist              ← SoundCloud set
```

---

### 🔄 Track State

| Command | Aliases | Description |
|---|---|---|
| `loop` | `repeat`, `l` | Toggle loop for the current track |
| `loopqueue` | `lq`, `repeatqueue`, `queueloop` | Toggle loop for the entire queue |
| `shuffle` | `sh`, `mix` | Shuffle (or unshuffle) the queue |
| `autoplay` | `ap` | Toggle autoplay when queue ends |

---

### 📋 Queue

| Command | Aliases | Description | Usage |
|---|---|---|---|
| `queue` | `q`, `list` | Display the queue | `.queue [page]` |
| `nowplaying` | `np`, `current`, `song`, `playing` | Show the current track | `.nowplaying` |
| `remove` | `rm`, `delete`, `del` | Remove a track | `.remove <position>` |
| `move` | `mv` | Move a track to another position | `.move <from> <to>` |
| `clear` | `clr`, `empty` | Clear the queue | `.clear` |
| `skipto` | `jt`, `jump`, `goto`, `jumpto` | Jump to a position in the queue | `.skipto <position>` |

---

### ✨ Special

| Command | Aliases | Description |
|---|---|---|
| `lofi` | `lf`, `chill` | Toggle lofi hip hop radio |
| `247` | `stay`, `stay247` | Toggle 24/7 mode |

---

### ℹ️ Information

| Command | Aliases | Description | Usage |
|---|---|---|---|
| `help` | `h`, `commands`, `cmds` | Show commands or details for a specific command | `.help [command]` |
| `ping` | `pong`, `latency` | Show bot latency | `.ping` |

---

### ⚙️ Settings

| Command | Aliases | Description | Usage | Permission |
|---|---|---|---|---|
| `prefix` | `pfx`, `setprefix` | View or change the prefix | `.prefix [new]` | Administrator |
| `language` | `lang`, `setlang` | View or change language (`en` / `ja`) | `.language [en\|ja]` | Administrator |
| `musicchannel` | `mc`, `mch`, `setmusicchannel` | Set a channel where no prefix is needed | `.musicchannel [set \| #channel \| clear]` | Administrator |

**Music channel behaviour:**
- Send any command name without a prefix: `skip`, `queue`, `pause` …
- Send a YouTube / Spotify URL alone to play it immediately
- Normal prefix commands still work inside the channel

---

## 🔧 Development

```bash
npm run typecheck     # TypeScript type check
npm run lint          # ESLint (zero warnings policy)
npm run lint:fix      # Auto-fix lint issues
npm run format        # Prettier format
npm run format:check  # Check formatting
```

### Project structure

```
src/
├── index.ts                    # Entry point
├── config.ts                   # Config loader (config.jsonc + .env)
├── types/index.ts              # Shared TypeScript interfaces
├── locales/                    # en.json, ja.json
├── utils/
│   ├── i18n.ts                 # Translation helper
│   ├── embeds.ts               # Discord embed builders
│   └── search.ts               # URL / query resolver
├── core/
│   ├── Queue.ts                # Queue with loop / shuffle / history
│   ├── MusicPlayer.ts          # Per-guild audio player
│   └── GuildManager.ts         # Guild settings (debounced disk writes)
├── commands/
│   ├── CommandHandler.ts       # Loader, slash registration, context builder
│   ├── playback/
│   ├── track-state/
│   ├── queue/
│   ├── special/
│   ├── information/
│   └── settings/
└── events/                     # ready, messageCreate, interactionCreate
```

---

## 📄 License

MIT
