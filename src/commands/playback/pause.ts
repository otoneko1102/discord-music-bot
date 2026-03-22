import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected || !player.isPlaying) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notPlaying'))], flags: 64 });
    return;
  }

  const success = player.pause();
  if (!success) {
    await ctx.reply({ embeds: [errorEmbed(t('pause.alreadyPaused'))], flags: 64 });
    return;
  }

  await ctx.reply({ embeds: [successEmbed(t('pause.paused'))] });
}

const command: Command = {
  name: 'pause',
  aliases: ['pa'],
  description: 'Pause the current song',
  descriptionJa: '再生を一時停止します',
  category: 'playback',
  execute,
};

export default command;
