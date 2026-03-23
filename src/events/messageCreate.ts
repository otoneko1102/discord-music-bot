import type { Message } from 'discord.js';
import commandHandler from '../commands/CommandHandler';
import guildManager from '../core/GuildManager';
import { detectInputType } from '../utils/search';
import { errorEmbed } from '../utils/embeds';
import { hasAdminAccess, passesRoleFilter } from '../utils/permissions';

export default async function onMessageCreate(message: Message): Promise<void> {
  // Ignore bots and DMs
  if (message.author.bot || !message.guild) return;

  const guildId = message.guild.id;

  // Check if server is allowed
  if (!commandHandler.isServerAllowed(guildId)) return;

  const prefix = guildManager.getPrefix(guildId);
  const clientId = message.client.user?.id ?? '';
  const musicChannelId = guildManager.getMusicChannelId(guildId);

  let content = message.content;
  let isMention = false;

  const mentionRegex = new RegExp(`^<@!?${clientId}>\\s*`);

  if (content.startsWith(prefix)) {
    content = content.slice(prefix.length).trim();
  } else if (mentionRegex.test(content)) {
    content = content.replace(mentionRegex, '').trim();
    isMention = true;
  } else if (musicChannelId && message.channelId === musicChannelId) {
    // In music channel without prefix or mention — handle specially
    await handleMusicChannel(message, content.trim());
    return;
  } else {
    return;
  }

  if (!content) {
    if (isMention) {
      content = 'help';
    } else {
      return;
    }
  }

  const [commandName, ...args] = content.split(/\s+/);
  if (!commandName) return;

  const command = commandHandler.get(commandName.toLowerCase());
  if (!command) return;

  if (!message.member) return;

  const ctx = commandHandler.buildMessageContext(message, args);
  const { language } = guildManager.get(guildId);
  const { createTranslator } = await import('../utils/i18n');
  const t = createTranslator(language);

  if (!passesRoleFilter(message.member!)) {
    await message.reply({
      embeds: [errorEmbed(t('common.roleBlocked'))],
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  if (command.requiresAdmin && !hasAdminAccess(message.member!)) {
    await message.reply({
      embeds: [errorEmbed(t('common.requiresAdmin'))],
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  try {
    await command.execute(ctx);
  } catch (err) {
    console.error(`[MessageCreate] Error in command "${commandName}":`, err);
    const errMsg = err instanceof Error ? err.message : String(err);
    const t = ctx.t;
    try {
      await ctx.reply({ embeds: [errorEmbed(t('common.error', errMsg))] });
    } catch {
      /* ignore reply errors */
    }
  }
}

/**
 * Handle a message in the dedicated music channel.
 * - If the first word matches a command name, execute it (no prefix needed).
 * - If the content is a URL but not a known command, auto-play it.
 */
async function handleMusicChannel(message: Message, content: string): Promise<void> {
  if (!content || !message.member) return;

  const [first, ...rest] = content.split(/\s+/);
  if (!first) return;

  const { language } = guildManager.get(message.guild!.id);
  const { createTranslator } = await import('../utils/i18n');
  const t = createTranslator(language);

  if (!passesRoleFilter(message.member!)) {
    await message.reply({
      embeds: [errorEmbed(t('common.roleBlocked'))],
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // Try to match as a command
  const command = commandHandler.get(first.toLowerCase());
  if (command) {
    if (command.requiresAdmin && !hasAdminAccess(message.member!)) {
      await message.reply({
        embeds: [errorEmbed(t('common.requiresAdmin'))],
        allowedMentions: { repliedUser: false },
      });
      return;
    }
    const ctx = commandHandler.buildMessageContext(message, rest);
    try {
      await command.execute(ctx);
    } catch (err) {
      console.error(`[MusicChannel] Error in command "${first}":`, err);
    }
    return;
  }

  // Not a command — if it looks like a URL, auto-play it
  const inputType = detectInputType(content);
  if (inputType !== 'query') {
    const playCmd = commandHandler.get('play');
    if (!playCmd) return;
    const ctx = commandHandler.buildMessageContext(message, [content]);
    try {
      await playCmd.execute(ctx);
    } catch (err) {
      console.error('[MusicChannel] Error playing URL:', err);
    }
  }
}
