import type { SlashCommandBuilder } from 'discord.js';
import type { Command, CommandContext } from '../../types';
import { queueEmbed, errorEmbed } from '../../utils/embeds';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder.addIntegerOption(o => o.setName('page').setDescription('Page number').setMinValue(1));
}

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notPlaying'))], flags: 64 });
    return;
  }

  const page = ctx.isSlash ? (ctx.getInteger('page') ?? 1) : parseInt(ctx.args[0] ?? '1', 10) || 1;

  const totalPages = player.queue.totalPages;
  const clampedPage = Math.max(1, Math.min(page, totalPages));

  const embed = queueEmbed(
    player.queue.tracks,
    player.queue.getCurrent(),
    clampedPage,
    totalPages,
    player.queue.size,
    t
  );

  await ctx.reply({ embeds: [embed] });
}

const command: Command = {
  name: 'queue',
  aliases: ['q', 'list'],
  description: 'Show the music queue',
  descriptionJa: '音楽キューを表示します',
  category: 'queue',
  usage: '[page]',
  execute,
};

export default command;
