import type { SlashCommandBuilder } from 'discord.js';
import type { Command, CommandContext } from '../../types';
import { successEmbed, infoEmbed, errorEmbed } from '../../utils/embeds';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder.addIntegerOption(o =>
    o.setName('level').setDescription('Volume level (0-100)').setMinValue(0).setMaxValue(100)
  );
}

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player, guildManager, guildId } = ctx;

  const input = ctx.isSlash
    ? ctx.getInteger('level')
    : ctx.args[0]
      ? parseInt(ctx.args[0], 10)
      : null;

  // No argument → show current volume
  if (input === null || isNaN(input as number)) {
    await ctx.reply({ embeds: [infoEmbed(t('volume.current', player.volume))] });
    return;
  }

  const vol = input as number;
  if (vol < 0 || vol > 100) {
    await ctx.reply({ embeds: [errorEmbed(t('volume.outOfRange'))], flags: 64 });
    return;
  }

  player.setVolume(vol);
  guildManager.set(guildId, { volume: vol });
  await ctx.reply({ embeds: [successEmbed(t('volume.set', vol))] });
}

const command: Command = {
  name: 'volume',
  aliases: ['vol', 'v'],
  description: 'Set or view the playback volume (0-100)',
  descriptionJa: '音量を設定または確認します（0〜100）',
  category: 'playback',
  usage: '[0-100]',
  execute,
};

export default command;
