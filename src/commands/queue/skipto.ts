import type { SlashCommandBuilder } from 'discord.js';
import type { Command, CommandContext } from '../../types';
import { nowPlayingEmbed, errorEmbed } from '../../utils/embeds';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder.addIntegerOption(o =>
    o
      .setName('position')
      .setDescription('Queue position to jump to')
      .setRequired(true)
      .setMinValue(1)
  );
}

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected || player.queue.isEmpty()) {
    await ctx.reply({ embeds: [errorEmbed(t('common.emptyQueue'))], flags: 64 });
    return;
  }

  const pos = ctx.isSlash
    ? (ctx.getInteger('position') ?? 0)
    : parseInt(ctx.args[0] ?? '', 10) || 0;

  const track = await player.skipTo(pos);
  if (!track) {
    await ctx.reply({
      embeds: [errorEmbed(t('common.invalidArgs', '.skipto <position>'))],
      flags: 64,
    });
    return;
  }

  await ctx.reply({ embeds: [nowPlayingEmbed(track, player, t)] });
}

const command: Command = {
  name: 'skipto',
  aliases: ['jt', 'jump', 'goto', 'jumpto'],
  description: 'Skip to a specific position in the queue',
  descriptionJa: 'キューの指定位置にジャンプします',
  category: 'queue',
  usage: '<position>',
  execute,
};

export default command;
