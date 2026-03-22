import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player, voiceChannel } = ctx;

  if (!voiceChannel) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notInVoice'))], flags: 64 });
    return;
  }

  if (player.isConnected && player.voiceConnection?.joinConfig.channelId === voiceChannel.id) {
    await ctx.reply({
      embeds: [errorEmbed(t('join.alreadyJoined', voiceChannel.name))],
      flags: 64,
    });
    return;
  }

  try {
    await player.join(voiceChannel, false);
    await ctx.reply({ embeds: [successEmbed(t('join.joined', voiceChannel.name))] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.reply({ embeds: [errorEmbed(t('common.error', msg))], flags: 64 });
  }
}

const command: Command = {
  name: 'join',
  aliases: ['j', 'summon', 'connect'],
  description: 'Join your voice channel',
  descriptionJa: 'ボイスチャンネルに参加します',
  category: 'playback',
  execute,
};

export default command;
