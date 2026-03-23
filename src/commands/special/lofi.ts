import type { Command, CommandContext } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player, voiceChannel, guildManager, guildId } = ctx;

  if (!voiceChannel) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notInVoice'))], flags: 64 });
    return;
  }

  if (player.isConnected && player.voiceConnection?.joinConfig.channelId !== voiceChannel.id) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notSameVoice'))], flags: 64 });
    return;
  }

  if (player.lofiMode) {
    await player.setLofi(false);
    guildManager.set(guildId, { lofi: false });
    await ctx.reply({ embeds: [successEmbed(t('lofi.disabled'))] });
    return;
  }

  try {
    await ctx.deferReply();
    if (!player.isConnected) await player.join(voiceChannel, false);
    await player.setLofi(true);
    guildManager.set(guildId, { lofi: true });
    await ctx.editReply({ embeds: [successEmbed(t('lofi.enabled'))] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.editReply({ embeds: [errorEmbed(t('common.error', msg))] });
  }
}

const command: Command = {
  name: 'lofi',
  aliases: ['lf', 'chill'],
  description: 'Toggle lofi hip hop radio stream',
  descriptionJa: 'Lofi Hip Hopラジオを切り替えます',
  category: 'special',
  requiresAdmin: true,
  execute,
};

export default command;
