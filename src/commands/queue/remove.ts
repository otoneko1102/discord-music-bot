import type { SlashCommandBuilder } from 'discord.js';
import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder.addIntegerOption(o =>
    o
      .setName('position')
      .setDescription('Queue position to remove')
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

  const track = player.queue.remove(pos);
  if (!track) {
    await ctx.reply({ embeds: [errorEmbed(t('remove.invalidPosition'))], flags: 64 });
    return;
  }

  await ctx.reply({ embeds: [successEmbed(t('remove.removed', track.title))] });
}

const command: Command = {
  name: 'remove',
  aliases: ['rm', 'delete', 'del'],
  description: 'Remove a track from the queue',
  descriptionJa: 'キューから曲を削除します',
  category: 'queue',
  usage: '<position>',
  execute,
};

export default command;
