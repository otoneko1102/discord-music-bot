import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected || player.queue.isEmpty()) {
    await ctx.reply({ embeds: [errorEmbed(t('common.emptyQueue'))], flags: 64 });
    return;
  }

  if (player.queue.isShuffled) {
    player.queue.unshuffle();
    player.persistQueueState();
    await ctx.reply({ embeds: [successEmbed(t('shuffle.unshuffled'))] });
  } else {
    player.queue.shuffle();
    player.persistQueueState();
    await ctx.reply({ embeds: [successEmbed(t('shuffle.shuffled'))] });
  }
}

const command: Command = {
  name: 'shuffle',
  aliases: ['sh', 'mix'],
  description: 'Shuffle (or unshuffle) the queue',
  descriptionJa: 'キューをシャッフル（または解除）します',
  category: 'track-state',
  execute,
};

export default command;
