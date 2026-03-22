import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected) {
    await ctx.reply({ embeds: [errorEmbed(t('disconnect.notConnected'))], flags: 64 });
    return;
  }

  const channelName =
    ctx.guild.channels.cache.get(player.voiceConnection?.joinConfig.channelId ?? '')?.name ??
    'voice channel';

  player.disconnect(false);
  await ctx.reply({ embeds: [successEmbed(t('disconnect.disconnected', channelName))] });
}

const command: Command = {
  name: 'disconnect',
  aliases: ['dc', 'leave', 'bye'],
  description: 'Disconnect from the voice channel',
  descriptionJa: 'ボイスチャンネルから切断します',
  category: 'playback',
  execute,
};

export default command;
