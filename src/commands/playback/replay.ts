import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  const current = player.queue.getCurrent();
  if (!player.isConnected || !current) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notPlaying'))], flags: 64 });
    return;
  }

  await player.replay();
  await ctx.reply({ embeds: [successEmbed(t('replay.replayed', current.title))] });
}

const command: Command = {
  name: 'replay',
  aliases: ['rp', 'restart'],
  description: 'Replay the current song from the beginning',
  descriptionJa: '現在の曲を最初から再生します',
  category: 'playback',
  execute,
};

export default command;
