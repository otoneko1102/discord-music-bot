import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected || player.queue.isEmpty()) {
    await ctx.reply({ embeds: [errorEmbed(t('common.emptyQueue'))], flags: 64 });
    return;
  }

  player.queue.clear();
  await ctx.reply({ embeds: [successEmbed(t('clear.cleared'))] });
}

const command: Command = {
  name: 'clear',
  aliases: ['clr', 'empty'],
  description: 'Clear the entire queue',
  descriptionJa: 'キューを全てクリアします',
  category: 'queue',
  execute,
};

export default command;
