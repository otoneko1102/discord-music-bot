import type { SlashCommandBuilder } from 'discord.js';
import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import { formatDuration } from '../../utils/embeds';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder.addStringOption(o =>
    o.setName('time').setDescription('Time to seek to (e.g. 1:30 or 90)').setRequired(true)
  );
}

function parseTime(input: string): number | null {
  const plain = parseInt(input, 10);
  if (!isNaN(plain) && String(plain) === input) return plain;

  const match = /^(?:(\d+):)?(\d+):(\d+)$/.exec(input) ?? /^(\d+):(\d+)$/.exec(input);
  if (!match) return null;

  if (match.length === 4) {
    // H:MM:SS
    return (
      (parseInt(match[1]!, 10) || 0) * 3600 + parseInt(match[2]!, 10) * 60 + parseInt(match[3]!, 10)
    );
  }
  // MM:SS
  return parseInt(match[1]!, 10) * 60 + parseInt(match[2]!, 10);
}

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  const current = player.queue.getCurrent();
  if (!player.isConnected || !current) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notPlaying'))], flags: 64 });
    return;
  }

  const input = ctx.isSlash ? (ctx.getString('time') ?? '') : (ctx.args[0] ?? '');
  const seconds = parseTime(input);

  if (seconds === null) {
    await ctx.reply({ embeds: [errorEmbed(t('seek.invalidTime'))], flags: 64 });
    return;
  }

  if (current.isLive) {
    await ctx.reply({ embeds: [errorEmbed(t('seek.notSeekable'))], flags: 64 });
    return;
  }

  if (current.duration && seconds >= current.duration) {
    await ctx.reply({ embeds: [errorEmbed(t('seek.outOfRange'))], flags: 64 });
    return;
  }

  await player.seek(seconds);
  await ctx.reply({ embeds: [successEmbed(t('seek.seeked', formatDuration(seconds)))] });
}

const command: Command = {
  name: 'seek',
  aliases: ['se'],
  description: 'Seek to a position in the current song',
  descriptionJa: '現在の曲の指定位置にシークします',
  category: 'playback',
  usage: '<1:30 | 90>',
  execute,
};

export default command;
