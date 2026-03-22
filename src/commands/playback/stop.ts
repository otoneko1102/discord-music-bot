import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notPlaying'))], flags: 64 });
    return;
  }

  player.stop();
  await ctx.reply({ embeds: [successEmbed(t('stop.stopped'))] });
}

const command: Command = {
  name: 'stop',
  aliases: ['st', 'stp'],
  description: 'Stop playback and clear the queue',
  descriptionJa: '再生を停止してキューをクリアします',
  category: 'playback',
  execute,
};

export default command;
