import type { Command, CommandContext } from '../../types';
import { nowPlayingEmbed, errorEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  const current = player.queue.getCurrent();
  if (!player.isConnected || !current) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notPlaying'))], flags: 64 });
    return;
  }

  await ctx.reply({ embeds: [nowPlayingEmbed(current, player, t)] });
}

const command: Command = {
  name: 'nowplaying',
  aliases: ['np', 'current', 'song', 'playing'],
  description: 'Show the currently playing track',
  descriptionJa: '現在再生中の曲を表示します',
  category: 'queue',
  execute,
};

export default command;
