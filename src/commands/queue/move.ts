import type { SlashCommandBuilder } from 'discord.js';
import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder
    .addIntegerOption(o =>
      o.setName('from').setDescription('Current position').setRequired(true).setMinValue(1)
    )
    .addIntegerOption(o =>
      o.setName('to').setDescription('New position').setRequired(true).setMinValue(1)
    );
}

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected || player.queue.isEmpty()) {
    await ctx.reply({ embeds: [errorEmbed(t('common.emptyQueue'))], flags: 64 });
    return;
  }

  const from = ctx.isSlash ? (ctx.getInteger('from') ?? 0) : parseInt(ctx.args[0] ?? '', 10) || 0;
  const to = ctx.isSlash ? (ctx.getInteger('to') ?? 0) : parseInt(ctx.args[1] ?? '', 10) || 0;

  if (from === to) {
    await ctx.reply({ embeds: [errorEmbed(t('move.samePosition'))], flags: 64 });
    return;
  }

  const track = player.queue.tracks[from - 1];
  const ok = player.queue.move(from, to);

  if (!ok || !track) {
    await ctx.reply({
      embeds: [errorEmbed(t('common.invalidArgs', '.move <from> <to>'))],
      flags: 64,
    });
    return;
  }

  await ctx.reply({ embeds: [successEmbed(t('move.moved', track.title, to))] });
}

const command: Command = {
  name: 'move',
  aliases: ['mv'],
  description: 'Move a track to a different position in the queue',
  descriptionJa: 'キューの曲を別の位置に移動します',
  category: 'queue',
  usage: '<from> <to>',
  execute,
};

export default command;
