import { ChannelType } from 'discord.js';
import type { SlashCommandBuilder } from 'discord.js';
import type { Command, CommandContext } from '../../types';
import { successEmbed, infoEmbed, errorEmbed } from '../../utils/embeds';
import { hasAdminAccess } from '../../utils/permissions';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder
    .addChannelOption(o =>
      o
        .setName('channel')
        .setDescription('Text channel to designate as the music channel')
        .addChannelTypes(ChannelType.GuildText)
    )
    .addBooleanOption(o => o.setName('clear').setDescription('Clear the music channel setting'));
}

async function execute(ctx: CommandContext): Promise<void> {
  const { t, guildManager, guildId, guild, member } = ctx;

  const isClear = ctx.isSlash
    ? ctx.getBoolean('clear') === true
    : ctx.args[0]?.toLowerCase() === 'clear';

  // For slash: read the channel option directly
  const slashChannel = ctx.isSlash
    ? (ctx.interaction?.options.getChannel('channel') ?? null)
    : null;

  // For text commands: parse #mention or 'set' (= use current channel)
  let targetChannelId: string | null = null;
  if (ctx.isSlash) {
    targetChannelId = slashChannel?.id ?? null;
  } else if (!isClear && ctx.args[0]) {
    const arg = ctx.args[0];
    if (arg === 'set') {
      targetChannelId = ctx.channel.id;
    } else {
      const mentionMatch = /^<#(\d+)>$/.exec(arg);
      if (mentionMatch) targetChannelId = mentionMatch[1]!;
    }
  }

  // No action — show current setting
  if (!isClear && targetChannelId === null) {
    const currentId = guildManager.getMusicChannelId(guildId);
    if (!currentId) {
      await ctx.reply({ embeds: [infoEmbed(t('musicchannel.notSet'))] });
    } else {
      const ch = guild.channels.cache.get(currentId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const name = ch ? `#${(ch as any).name}` : `<#${currentId}>`;
      await ctx.reply({ embeds: [infoEmbed(t('musicchannel.current', name))] });
    }
    return;
  }

  if (!hasAdminAccess(member)) {
    await ctx.reply({ embeds: [errorEmbed(t('common.requiresAdmin'))], flags: 64 });
    return;
  }

  if (isClear) {
    guildManager.set(guildId, { musicChannelId: null });
    await ctx.reply({ embeds: [successEmbed(t('musicchannel.cleared'))] });
    return;
  }

  guildManager.set(guildId, { musicChannelId: targetChannelId });
  await ctx.reply({ embeds: [successEmbed(t('musicchannel.set', `<#${targetChannelId}>`))] });
}

const command: Command = {
  name: 'musicchannel',
  aliases: ['mc', 'mch', 'setmusicchannel'],
  description: 'Set a dedicated channel where commands work without a prefix',
  descriptionJa: 'プレフィックス不要でコマンドが使えるチャンネルを設定します',
  category: 'settings',
  usage: '[set | #channel | clear]',
  execute,
};

export default command;
