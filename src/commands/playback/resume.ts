import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notPlaying'))], flags: 64 });
    return;
  }

  const success = player.resume();
  if (!success) {
    await ctx.reply({ embeds: [errorEmbed(t('resume.notPaused'))], flags: 64 });
    return;
  }

  await ctx.reply({ embeds: [successEmbed(t('resume.resumed'))] });
}

const command: Command = {
  name: 'resume',
  aliases: ['r', 'continue'],
  description: 'Resume playback',
  descriptionJa: '再生を再開します',
  category: 'playback',
  execute,
};

export default command;
