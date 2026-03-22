import type { SlashCommandBuilder } from 'discord.js';
import { PermissionFlagsBits } from 'discord.js';
import type { Command, CommandContext } from '../../types';
import { successEmbed, infoEmbed, errorEmbed } from '../../utils/embeds';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder.addStringOption(o =>
    o.setName('prefix').setDescription('New prefix (leave empty to see current)').setMaxLength(5)
  );
}

async function execute(ctx: CommandContext): Promise<void> {
  const { t, guildManager, guildId, member } = ctx;

  const newPrefix = ctx.isSlash ? ctx.getString('prefix') : (ctx.args[0] ?? null);

  // Show current prefix if no argument
  if (!newPrefix) {
    const current = guildManager.getPrefix(guildId);
    await ctx.reply({ embeds: [infoEmbed(t('prefix.current', current))] });
    return;
  }

  // Require Administrator
  if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
    await ctx.reply({ embeds: [errorEmbed(t('prefix.requiresAdmin'))], flags: 64 });
    return;
  }

  if (newPrefix.length > 5) {
    await ctx.reply({ embeds: [errorEmbed(t('prefix.tooLong'))], flags: 64 });
    return;
  }

  guildManager.set(guildId, { prefix: newPrefix });
  await ctx.reply({ embeds: [successEmbed(t('prefix.set', newPrefix))] });
}

const command: Command = {
  name: 'prefix',
  aliases: ['pfx', 'setprefix'],
  description: 'View or change the command prefix',
  descriptionJa: 'コマンドプレフィックスを確認または変更します',
  category: 'settings',
  usage: '[new prefix]',
  execute,
};

export default command;
