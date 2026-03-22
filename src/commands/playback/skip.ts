import type { SlashCommandBuilder } from 'discord.js';
import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder.addIntegerOption(o =>
    o.setName('amount').setDescription('Number of tracks to skip').setMinValue(1)
  );
}

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected || (!player.isPlaying && !player.isPaused)) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notPlaying'))], flags: 64 });
    return;
  }

  const amount = ctx.isSlash
    ? (ctx.getInteger('amount') ?? 1)
    : parseInt(ctx.args[0] ?? '1', 10) || 1;

  // Skip multiple tracks by removing from queue first
  for (let i = 1; i < amount; i++) {
    player.queue.remove(1);
  }

  await player.skip();
  await ctx.reply({ embeds: [successEmbed(t('skip.skipped'))] });
}

const command: Command = {
  name: 'skip',
  aliases: ['s', 'next', 'sk'],
  description: 'Skip the current song',
  descriptionJa: '現在の曲をスキップします',
  category: 'playback',
  execute,
};

export default command;
