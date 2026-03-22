import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notPlaying'))], flags: 64 });
    return;
  }

  if (player.loopMode === 'track') {
    player.loopMode = 'off';
    await ctx.reply({ embeds: [successEmbed(t('loop.disabled'))] });
  } else {
    player.loopMode = 'track';
    await ctx.reply({ embeds: [successEmbed(t('loop.enabled'))] });
  }
}

const command: Command = {
  name: 'loop',
  aliases: ['repeat', 'l'],
  description: 'Toggle looping of the current track',
  descriptionJa: '現在の曲のループを切り替えます',
  category: 'track-state',
  execute,
};

export default command;
