import type { SlashCommandBuilder } from 'discord.js';
import type { Command, CommandContext } from '../../types';
import { successEmbed, infoEmbed, errorEmbed } from '../../utils/embeds';
import { isValidLanguage, createTranslator } from '../../utils/i18n';
import { hasAdminAccess } from '../../utils/permissions';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder.addStringOption(o =>
    o
      .setName('language')
      .setDescription('Language to set (en / ja)')
      .addChoices({ name: 'English', value: 'en' }, { name: '日本語 (Japanese)', value: 'ja' })
  );
}

async function execute(ctx: CommandContext): Promise<void> {
  const { t, guildManager, guildId, member } = ctx;

  const newLang = ctx.isSlash ? ctx.getString('language') : (ctx.args[0] ?? null);

  if (!newLang) {
    const current = guildManager.getLanguage(guildId);
    await ctx.reply({ embeds: [infoEmbed(t('language.current', current))] });
    return;
  }

  if (!hasAdminAccess(member)) {
    await ctx.reply({ embeds: [errorEmbed(t('common.requiresAdmin'))], flags: 64 });
    return;
  }

  if (!isValidLanguage(newLang)) {
    await ctx.reply({ embeds: [errorEmbed(t('language.invalid'))], flags: 64 });
    return;
  }

  guildManager.set(guildId, { language: newLang });

  // Reply with the new language's confirmation
  const newT = createTranslator(newLang);

  await ctx.reply({ embeds: [successEmbed(newT('language.set', newLang))] });
}

const command: Command = {
  name: 'language',
  aliases: ['lang', 'setlang'],
  description: 'View or change the bot language (en / ja)',
  descriptionJa: 'Botの言語を確認または変更します（en / ja）',
  category: 'settings',
  usage: '[en | ja]',
  execute,
};

export default command;
