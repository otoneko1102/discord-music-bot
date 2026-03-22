import type { Interaction } from 'discord.js';
import commandHandler from '../commands/CommandHandler';
import { errorEmbed } from '../utils/embeds';
import { createTranslator } from '../utils/i18n';
import guildManager from '../core/GuildManager';

export default async function onInteractionCreate(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) return;

  const guildId = interaction.guildId!;

  if (!commandHandler.isServerAllowed(guildId)) {
    await interaction.reply({
      embeds: [errorEmbed('This bot is not available in this server.')],
      flags: 64,
    });
    return;
  }

  const command = commandHandler.get(interaction.commandName);
  if (!command) return;

  const lang = guildManager.getLanguage(guildId);
  const t = createTranslator(lang);

  const ctx = commandHandler.buildSlashContext(interaction);

  try {
    await command.execute(ctx);
  } catch (err) {
    console.error(`[InteractionCreate] Error in /${interaction.commandName}:`, err);
    const errMsg = err instanceof Error ? err.message : String(err);

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed(t('common.error', errMsg))] });
      } else {
        await interaction.reply({ embeds: [errorEmbed(t('common.error', errMsg))], flags: 64 });
      }
    } catch {
      /* ignore */
    }
  }
}
