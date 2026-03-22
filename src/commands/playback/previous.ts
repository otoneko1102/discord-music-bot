import type { Command, CommandContext } from '../../types';
import { nowPlayingEmbed, errorEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notPlaying'))], flags: 64 });
    return;
  }

  const track = await player.previous();

  if (!track) {
    await ctx.reply({ embeds: [errorEmbed(t('previous.noPrevious'))], flags: 64 });
    return;
  }

  await ctx.reply({ embeds: [nowPlayingEmbed(track, player, t)] });
}

const command: Command = {
  name: 'previous',
  aliases: ['prev', 'back', 'pr'],
  description: 'Play the previous song',
  descriptionJa: '前の曲を再生します',
  category: 'playback',
  execute,
};

export default command;
