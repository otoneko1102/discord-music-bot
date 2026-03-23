import type { Command, CommandContext } from '../../types';
import { successEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player, guildManager, guildId } = ctx;

  player.stay247 = !player.stay247;
  guildManager.set(guildId, { stay247: player.stay247 });

  const msg = player.stay247 ? t('stay247.enabled') : t('stay247.disabled');
  await ctx.reply({ embeds: [successEmbed(msg)] });
}

const command: Command = {
  name: '247',
  aliases: ['stay', 'stay247'],
  description: 'Toggle 24/7 mode (bot stays in voice channel)',
  descriptionJa: '24/7モードを切り替えます（ボイスチャンネルに常駐）',
  category: 'special',
  requiresAdmin: true,
  execute,
};

export default command;
