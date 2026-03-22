import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notPlaying'))], flags: 64 });
    return;
  }

  if (player.loopMode === 'queue') {
    player.loopMode = 'off';
    await ctx.reply({ embeds: [successEmbed(t('loopqueue.disabled'))] });
  } else {
    player.loopMode = 'queue';
    await ctx.reply({ embeds: [successEmbed(t('loopqueue.enabled'))] });
  }
}

const command: Command = {
  name: 'loopqueue',
  aliases: ['lq', 'repeatqueue', 'queueloop'],
  description: 'Toggle looping of the entire queue',
  descriptionJa: 'キュー全体のループを切り替えます',
  category: 'track-state',
  execute,
};

export default command;
