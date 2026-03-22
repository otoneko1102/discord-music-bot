# 🎵 Discord 音楽Bot

[English version here](README.md)

[![Node.js](https://img.shields.io/badge/Node.js-18.x%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org)
[![yt-dlp](https://img.shields.io/badge/yt--dlp-powered-FF0000?logo=youtube&logoColor=white)](https://github.com/yt-dlp/yt-dlp)
[![License: MIT](https://img.shields.io/badge/License-MIT-F7DF1E?logo=opensourceinitiative&logoColor=black)](LICENSE)

**discord.js v14**・**ytdlp-nodejs**・**TypeScript** で作られた多機能Discordミュージックボット。

## ✨ 機能

| 機能 | 説明 |
|---|---|
| 🎵 マルチソース再生 | YouTube・YouTube Music・SoundCloud・Spotify（トラック / アルバム / プレイリストURL） |
| 🔍 検索 | YouTubeキーワード検索 + ボタンによるインタラクティブ選択 |
| 🔁 ループモード | 現在の曲またはキュー全体をループ |
| 🔀 シャッフル | キューをシャッフル / 元に戻す |
| ♾ オートプレイ | キュー終了時に関連曲を自動再生 |
| ☕ Lofiモード | Lofi Hip Hopラジオを垂れ流し（ON/OFF切り替え） |
| 🕐 24/7モード | 全員が退出してもボイスチャンネルに居座る |
| 🌐 多言語対応 | 英語・日本語（サーバーごとに設定） |
| 🎚 音量調整 | 0〜100%の対数スケール（デフォルト: 70%） |
| ⚙️ サーバー別設定 | プレフィックス・言語をサーバーごとに変更 |
| 🔒 サーバーリスト | ホワイトリスト / ブラックリストでアクセス制御 |
| 📢 ミュージックチャンネル | プレフィックス不要でコマンドやURLを送るだけで使えるチャンネルを設定 |
| `/` スラッシュコマンド | プレフィックスコマンドと並行して対応 |
| `@` メンション | メンションでコマンドを実行可能 |

> **音声ソースについて:**
> - **YouTube / YouTube Music / SoundCloud** — yt-dlp 経由で直接ストリーミング。
> - **Spotify** — 埋め込みページからメタデータを取得し、YouTube検索で対応曲を解決してストリーミング。APIキー不要。キーワード検索はYouTubeのみ。Spotify URLを貼ると自動で再生されます。

---

## 🎮 コマンド一覧

デフォルトプレフィックス: **`.`**（`.prefix <新しいもの>` でサーバーごとに変更可）

**スラッシュコマンド**（`/play`）や**メンション**（`@Bot play`）でも使用できます。

---

### 🎵 再生 (Playback)

| コマンド | エイリアス | 説明 | 使い方 |
|---|---|---|---|
| `play` | `p` | YouTube / Spotify URL / キーワード検索で曲を再生 | `.play <曲名またはURL>` |
| `pause` | `pa` | 一時停止 | `.pause` |
| `resume` | `r`, `continue` | 再開 | `.resume` |
| `stop` | `st`, `stp` | 停止してキューをクリア | `.stop` |
| `skip` | `s`, `next`, `sk` | 現在の曲をスキップ | `.skip [スキップ数]` |
| `previous` | `prev`, `back`, `pr` | 前の曲を再生 | `.previous` |
| `seek` | `se` | 指定位置にシーク | `.seek <1:30 \| 90>` |
| `volume` | `vol`, `v` | 音量の確認または設定（0〜100） | `.volume [0-100]` |
| `join` | `j`, `summon`, `connect` | ボイスチャンネルに参加 | `.join` |
| `disconnect` | `dc`, `leave`, `bye` | 切断 | `.disconnect` |
| `replay` | `rp`, `restart` | 現在の曲を最初から再生 | `.replay` |

**使用例:**
```
.play lofi hip hop                                              ← YouTubeキーワード検索
.play https://youtu.be/dQw4w9WgXcQ                             ← YouTube URL
.play https://www.youtube.com/playlist?list=PLxxxxx            ← YouTubeプレイリスト
.play https://music.youtube.com/watch?v=...                    ← YouTube Music
.play https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT   ← Spotifyトラック
.play https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M ← Spotifyプレイリスト
.play https://soundcloud.com/artist/track                      ← SoundCloudトラック
.play https://soundcloud.com/artist/sets/playlist              ← SoundCloudセット
```

---

### 🔄 曲の状態 (Track State)

| コマンド | エイリアス | 説明 |
|---|---|---|
| `loop` | `repeat`, `l` | 現在の曲のループを切り替え |
| `loopqueue` | `lq`, `repeatqueue`, `queueloop` | キュー全体のループを切り替え |
| `shuffle` | `sh`, `mix` | キューをシャッフル（もう一度で元に戻す） |
| `autoplay` | `ap` | オートプレイを切り替え |

---

### 📋 キュー (Queue)

| コマンド | エイリアス | 説明 | 使い方 |
|---|---|---|---|
| `queue` | `q`, `list` | キューを表示 | `.queue [ページ]` |
| `nowplaying` | `np`, `current`, `song`, `playing` | 再生中の曲を表示 | `.nowplaying` |
| `remove` | `rm`, `delete`, `del` | キューから曲を削除 | `.remove <位置>` |
| `move` | `mv` | 曲を別の位置へ移動 | `.move <移動元> <移動先>` |
| `clear` | `clr`, `empty` | キューを全てクリア | `.clear` |
| `skipto` | `jt`, `jump`, `goto`, `jumpto` | キューの指定位置にジャンプ | `.skipto <位置>` |

---

### ✨ 特殊機能 (Special)

| コマンド | エイリアス | 説明 |
|---|---|---|
| `lofi` | `lf`, `chill` | Lofi Hip Hopラジオを切り替え |
| `247` | `stay`, `stay247` | 24/7モードを切り替え |

---

### ℹ️ 情報 (Information)

| コマンド | エイリアス | 説明 | 使い方 |
|---|---|---|---|
| `help` | `h`, `commands`, `cmds` | コマンド一覧または詳細を表示 | `.help [コマンド名]` |
| `ping` | `pong`, `latency` | レイテンシーを確認 | `.ping` |

---

### ⚙️ 設定 (Settings)

| コマンド | エイリアス | 説明 | 使い方 | 必要権限 |
|---|---|---|---|---|
| `prefix` | `pfx`, `setprefix` | プレフィックスの確認または変更 | `.prefix [新プレフィックス]` | 管理者 |
| `language` | `lang`, `setlang`, `言語` | 言語の確認または変更（`en` / `ja`） | `.language [en\|ja]` | 管理者 |
| `musicchannel` | `mc`, `mch`, `setmusicchannel` | プレフィックス不要チャンネルの設定 | `.musicchannel [set \| #チャンネル \| clear]` | 管理者 |

**ミュージックチャンネルの動作:**
- プレフィックス不要でコマンドを実行: `skip`、`queue`、`pause` など
- YouTube / Spotify / SoundCloud の URL を単体で送信すると即座に再生
- 通常のプレフィックスコマンドも引き続き使用可能

---

## 📦 必要環境

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- Discordボットトークン — [Discord Developer Portal](https://discord.com/developers/applications)
- FFmpegは`ffmpeg-static`に同梱、yt-dlpは`ytdlp-nodejs`が自動管理

---

## 🚀 セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` を `.env` にコピーして記入します：

```bash
cp .env.example .env
```

```env
# 必須
DISCORD_TOKEN=DiscordBotのトークン
CLIENT_ID=アプリケーションのクライアントID

# 任意 – 開発時に特定サーバーへ即時スラッシュコマンド登録
# DEV_GUILD_ID=サーバーID
```

| 設定 | 必須 | 用途 |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Botログイン |
| `CLIENT_ID` | ✅ | スラッシュコマンド登録 |
| `DEV_GUILD_ID` | — | 開発時の即時スラッシュコマンド登録 |

### 3. Botの設定

`config.jsonc.example` を `config.jsonc` にコピーして編集します：

```bash
cp config.jsonc.example config.jsonc
```

`config.jsonc` を編集します：

```jsonc
{
  // デフォルトのコマンドプレフィックス。管理者はサーバーごとに変更できます。
  "prefix": ".",
  "servers": {
    // "all" | "whitelist" | "blacklist"
    "mode": "all",
    "list": []
  },
  "lofi": {
    "url": "https://www.youtube.com/watch?v=jfKfPfyJRdk"
  },
  "defaultLanguage": "ja",
  "defaultVolume": 70,
  "maxQueueSize": 500,
  "maxPlaylistSize": 100,
  "searchResultCount": 5
}
```

**サーバーアクセスモード:**

| `mode` | 動作 |
|---|---|
| `"all"` | 全サーバーで使用可（デフォルト） |
| `"whitelist"` | `list` に記載したサーバーのみ |
| `"blacklist"` | `list` に記載したサーバーをブロック |

### 4. Discordの設定（Developer Portal）

[Developer Portal](https://discord.com/developers/applications) → **Bot** タブで以下を有効化：
- ✅ **Message Content Intent**

Botに必要な権限：
- テキスト: チャンネルを見る、メッセージを送信、埋め込みリンク、メッセージ履歴を読む
- ボイス: 接続、発言、音声検知を使用

招待URLのスコープ: `bot` + `applications.commands`

### 5. 起動

```bash
# 開発（ホットリロード）
npm run dev

# 本番
npm run build && npm start
```

---

## 🔧 開発 / セルフホスト

### 初期セットアップ

```bash
# 1. クローン
git clone https://github.com/your-username/discord-music-bot.git
cd discord-music-bot

# 2. 依存パッケージのインストール（FFmpeg・yt-dlp は自動管理）
npm install

# 3. 設定ファイルのコピー
#    macOS / Linux
cp .env.example .env
cp config.jsonc.example config.jsonc

#    Windows（コマンドプロンプト）
copy .env.example .env
copy config.jsonc.example config.jsonc
```

### Discord Bot の作成

1. [Discord Developer Portal](https://discord.com/developers/applications) を開き、**New Application** をクリックします。
2. **Bot** タブ → **Reset Token** でトークンをコピーし、`.env` の `DISCORD_TOKEN` に貼り付けます。
3. 同ページの *Privileged Gateway Intents* で ✅ **Message Content Intent** を有効にします。
4. **General Information** → **Application ID** をコピーし、`.env` の `CLIENT_ID` に貼り付けます。

Bot の招待は **OAuth2** → **URL Generator** から：
- スコープ: `bot`、`applications.commands`
- 権限: チャンネルを見る、メッセージを送信、埋め込みリンク、メッセージ履歴を読む、接続、発言、音声検知を使用

> **スラッシュコマンド**は初回起動時に自動登録されます。`DEV_GUILD_ID` を設定すると即時反映、未設定の場合はグローバル登録で最大1時間かかります。

### PM2 で本番運用

[PM2](https://pm2.keymetrics.io/) を使うとバックグラウンドで常駐させ、クラッシュ時に自動再起動できます。

```bash
# PM2 をグローバルインストール（初回のみ）
npm install -g pm2

# ecosystem config をコピーして編集
cp ecosystem.config.cjs.example ecosystem.config.cjs
# ecosystem.config.cjs に DISCORD_TOKEN と CLIENT_ID を記入

# ビルドして起動
npm run build
pm2 start ecosystem.config.cjs

# よく使う PM2 コマンド
pm2 status                  # 稼働状況の確認
pm2 logs discord-music-bot  # ログのリアルタイム表示
pm2 restart discord-music-bot
pm2 stop discord-music-bot
pm2 delete discord-music-bot

# OS 再起動時に自動起動
pm2 startup
pm2 save
```

> `ecosystem.config.cjs` にはボットトークンが含まれるため `.gitignore` で除外されています。絶対にコミットしないでください。

### 開発コマンド

```bash
npm run dev           # 自動リロードで起動（tsx watch）
npm run build         # TypeScript → dist/ にコンパイル
npm start             # コンパイル済みを起動
npm run typecheck     # TypeScript型チェック（出力なし）
npm run lint          # ESLint（警告0厳守）
npm run lint:fix      # ESLint自動修正
npm run format        # Prettierでフォーマット
npm run format:check  # フォーマット確認
```

### プロジェクト構成

```
src/
├── index.ts                    # エントリーポイント
├── config.ts                   # 設定ローダー（config.jsonc + .env）
├── types/index.ts              # 共通TypeScript型定義
├── locales/                    # en.json, ja.json
├── utils/
│   ├── i18n.ts                 # 翻訳ヘルパー
│   ├── embeds.ts               # Discord Embedビルダー
│   └── search.ts               # URL / クエリリゾルバー
├── core/
│   ├── Queue.ts                # ループ / シャッフル / 履歴付きキュー
│   ├── MusicPlayer.ts          # サーバーごとのオーディオプレイヤー
│   └── GuildManager.ts         # サーバー設定（デバウンス書き込み）
├── commands/
│   ├── CommandHandler.ts       # ローダー・スラッシュ登録・コンテキスト
│   ├── playback/
│   ├── track-state/
│   ├── queue/
│   ├── special/
│   ├── information/
│   └── settings/
└── events/                     # ready, messageCreate, interactionCreate
```

---

## 📄 ライセンス

MIT
