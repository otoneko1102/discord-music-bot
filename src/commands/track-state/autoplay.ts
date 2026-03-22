import type { Command, CommandContext } from '../../types';
import { successEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  player.autoplay = !player.autoplay;
  const msg = player.autoplay ? t('autoplay.enabled') : t('autoplay.disabled');
  await ctx.reply({ embeds: [successEmbed(msg)] });
}

const command: Command = {
  name: 'autoplay',
  aliases: ['ap'],
  description: 'Toggle autoplay (plays related songs when queue ends)',
  descriptionJa: 'オートプレイを切り替えます（キュー終了時に関連曲を再生）',
  category: 'track-state',
  execute,
};

export default command;
