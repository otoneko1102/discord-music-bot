import fs from 'fs';
import path from 'path';
import {
  REST,
  Routes,
  SlashCommandBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
  type Message,
  type Client,
  type TextChannel,
  type NewsChannel,
  type VoiceChannel,
  type StageChannel,
  type GuildMember,
} from 'discord.js';
import config from '../config';
import guildManager from '../core/GuildManager';
import MusicPlayer from '../core/MusicPlayer';
import { createTranslator } from '../utils/i18n';
import type { Command, CommandContext } from '../types';

/** Add SuppressNotifications flag to any reply/send payload (@silent behaviour). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withSilent(content: any): any {
  if (typeof content === 'string') return { content, flags: MessageFlags.SuppressNotifications };
  const existing = typeof content?.flags === 'number' ? content.flags : 0;
  return { ...content, flags: existing | MessageFlags.SuppressNotifications };
}

// Per-guild player instances
const players = new Map<string, MusicPlayer>();

export function getPlayer(guildId: string): MusicPlayer {
  if (!players.has(guildId)) {
    const vol = guildManager.getVolume(guildId);
    players.set(guildId, new MusicPlayer(guildId, vol));
  }
  return players.get(guildId)!;
}

export function removePlayer(guildId: string): void {
  players.delete(guildId);
}

export { players };

export class CommandHandler {
  private _commands = new Map<string, Command>();
  private _aliases = new Map<string, string>(); // alias → primary name

  async load(): Promise<void> {
    const categories = ['playback', 'track-state', 'queue', 'special', 'information', 'settings'];
    for (const category of categories) {
      const dir = path.join(__dirname, category);
      if (!fs.existsSync(dir)) continue;

      const files = fs
        .readdirSync(dir)
        .filter(f => f.endsWith('.js') || (f.endsWith('.ts') && !f.endsWith('.d.ts')));
      for (const file of files) {
        const mod = (await import(path.join(dir, file))) as {
          default?: Command;
          command?: Command;
        };
        const cmd: Command | undefined = mod.default ?? mod.command;
        if (!cmd?.name) continue;

        this._commands.set(cmd.name, cmd);
        for (const alias of cmd.aliases ?? []) {
          this._aliases.set(alias, cmd.name);
        }
      }
    }
    console.log(`[CommandHandler] Loaded ${this._commands.size} commands.`);
  }

  get(name: string): Command | null {
    return this._commands.get(name) ?? this._commands.get(this._aliases.get(name) ?? '') ?? null;
  }

  getAll(): Command[] {
    return [...this._commands.values()];
  }

  async registerSlashCommands(_client: Client): Promise<void> {
    const slashData: object[] = [];

    for (const cmd of this._commands.values()) {
      if (cmd.slashCommand === false) continue;

      const builder = new SlashCommandBuilder()
        .setName(cmd.name)
        .setDescription(cmd.description)
        .setContexts(0); // 0 = Guild only

      // The command file can export a `buildSlash` function for custom options
      const resolvedPath = this._resolveCommandPath(cmd);
      if (resolvedPath) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = (await import(resolvedPath)) as any;
        if (typeof mod.buildSlash === 'function') {
          mod.buildSlash(builder);
        }
      }

      slashData.push(builder.toJSON());
    }

    const rest = new REST().setToken(config.token);

    try {
      if (config.devGuildId) {
        // Register to dev guild instantly
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.devGuildId), {
          body: slashData,
        });
        console.log(`[CommandHandler] Registered ${slashData.length} slash commands to dev guild.`);
      } else {
        // Register globally (takes up to 1 hour to propagate)
        await rest.put(Routes.applicationCommands(config.clientId), { body: slashData });
        console.log(`[CommandHandler] Registered ${slashData.length} slash commands globally.`);
      }
    } catch (err) {
      console.error('[CommandHandler] Failed to register slash commands:', err);
    }
  }

  private _resolveCommandPath(cmd: Command): string {
    const categories = ['playback', 'track-state', 'queue', 'special', 'information', 'settings'];
    for (const cat of categories) {
      const p = path.join(__dirname, cat, `${cmd.name}.ts`);
      if (fs.existsSync(p)) return p;
      const pj = path.join(__dirname, cat, `${cmd.name}.js`);
      if (fs.existsSync(pj)) return pj;
    }
    return '';
  }

  buildSlashContext(interaction: ChatInputCommandInteraction): CommandContext {
    const guildId = interaction.guildId!;
    const settings = guildManager.get(guildId);
    const t = createTranslator(settings.language);
    const player = getPlayer(guildId);
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel as VoiceChannel | StageChannel | null;
    player.textChannel = interaction.channel as TextChannel | NewsChannel;

    return {
      isSlash: true,
      guildId,
      guild: interaction.guild!,
      member,
      channel: interaction.channel as TextChannel | NewsChannel,
      voiceChannel,

      reply: async content => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (interaction.reply as any)(
          withSilent(typeof content === 'string' ? { content, flags: 64 } : content)
        );
      },
      deferReply: async () => {
        await interaction.deferReply();
      },
      editReply: async content => {
        if (typeof content === 'string') return interaction.editReply({ content });
        return interaction.editReply(content as Parameters<typeof interaction.editReply>[0]);
      },
      followUp: async content => {
        return interaction.followUp(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          withSilent(typeof content === 'string' ? { content, flags: 64 } : content) as any
        );
      },
      args: [],
      getString: name => interaction.options.getString(name),
      getInteger: name => interaction.options.getInteger(name),
      getBoolean: name => interaction.options.getBoolean(name),
      getUser: name => interaction.options.getUser(name),
      interaction,
      message: null,
      player,
      guildManager,
      t,
    };
  }

  buildMessageContext(message: Message, args: string[]): CommandContext {
    const guildId = message.guildId!;
    const settings = guildManager.get(guildId);
    const t = createTranslator(settings.language);
    const player = getPlayer(guildId);
    const member = message.member!;
    const voiceChannel = member.voice.channel as VoiceChannel | StageChannel | null;
    player.textChannel = message.channel as TextChannel | NewsChannel;

    let _replied = false;
    let _replyMessage: Message | null = null;

    return {
      isSlash: false,
      guildId,
      guild: message.guild!,
      member,
      channel: message.channel as TextChannel | NewsChannel,
      voiceChannel,
      reply: async content => {
        if (!_replied) {
          _replied = true;
          _replyMessage = await message.reply(
            withSilent(content) as Parameters<typeof message.reply>[0]
          );
          return _replyMessage;
        }
      },
      deferReply: async () => {
        /* noop for text commands */
      },
      editReply: async content => {
        if (_replyMessage) {
          return _replyMessage.edit(
            withSilent(content) as Parameters<typeof _replyMessage.edit>[0]
          );
        }
        // No prior reply (e.g. deferReply was used) — send as initial reply
        if (!_replied) {
          _replied = true;
          _replyMessage = await message.reply(
            withSilent(content) as Parameters<typeof message.reply>[0]
          );
          return _replyMessage;
        }
      },
      followUp: async content => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (message.channel as any).send(withSilent(content));
      },
      args,
      getString: name => {
        // Simple positional arg lookup by index based on option order
        // Commands that need specific options handle this themselves via args[]
        const idx = parseInt(name, 10);
        if (!isNaN(idx)) return args[idx] ?? null;
        return args[0] ?? null;
      },
      getInteger: name => {
        const idx = parseInt(name, 10);
        const raw = !isNaN(idx) ? args[idx] : args[0];
        const n = parseInt(raw ?? '', 10);
        return isNaN(n) ? null : n;
      },
      getBoolean: _name => {
        const raw = args[0]?.toLowerCase();
        if (!raw) return null;
        if (['on', 'true', 'yes', '1'].includes(raw)) return true;
        if (['off', 'false', 'no', '0'].includes(raw)) return false;
        return null;
      },
      getUser: () => null,
      interaction: null,
      message,
      player,
      guildManager,
      t,
    };
  }

  isServerAllowed(guildId: string): boolean {
    const { mode, list } = config.servers;
    if (mode === 'all') return true;
    if (mode === 'whitelist') return list.includes(guildId);
    if (mode === 'blacklist') return !list.includes(guildId);
    return true;
  }
}

export default new CommandHandler();
