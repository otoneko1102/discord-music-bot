import { EmbedBuilder } from 'discord.js';
import type { Command, CommandContext } from '../../types';
import { COLOR_MUSIC } from '../../utils/embeds';

async function execute(ctx: CommandContext): Promise<void> {
  const { t } = ctx;
  const start = Date.now();

  await ctx.reply({
    embeds: [new EmbedBuilder().setColor(COLOR_MUSIC).setDescription('Pinging...')],
  });

  const latency = Date.now() - start;
  const apiLatency = ctx.message?.client.ws.ping ?? ctx.interaction?.client.ws.ping ?? -1;

  await ctx.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR_MUSIC)
        .setTitle(t('ping.title'))
        .addFields(
          { name: t('ping.latency'), value: `\`${latency}ms\``, inline: true },
          { name: t('ping.apiLatency'), value: `\`${apiLatency}ms\``, inline: true }
        ),
    ],
  });
}

const command: Command = {
  name: 'ping',
  aliases: ['pong', 'latency'],
  description: 'Check the bot latency',
  descriptionJa: 'Botのレイテンシーを確認します',
  category: 'information',
  execute,
};

export default command;
