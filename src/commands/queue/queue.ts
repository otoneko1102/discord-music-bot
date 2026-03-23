import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  type Message,
} from 'discord.js';
import type { SlashCommandBuilder } from 'discord.js';
import type { Command, CommandContext } from '../../types';
import { queueEmbed, errorEmbed } from '../../utils/embeds';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder.addIntegerOption(o => o.setName('page').setDescription('Page number').setMinValue(1));
}

function buildQueueRow(
  page: number,
  totalPages: number,
  disabled = false
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('queue_prev')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page <= 1),
    new ButtonBuilder()
      .setCustomId('queue_page')
      .setLabel(`${page} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('queue_next')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page >= totalPages)
  );
}

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player } = ctx;

  if (!player.isConnected) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notPlaying'))], flags: 64 });
    return;
  }

  const initialPage = ctx.isSlash
    ? (ctx.getInteger('page') ?? 1)
    : parseInt(ctx.args[0] ?? '1', 10) || 1;

  const totalPages = player.queue.totalPages;
  let currentPage = Math.max(1, Math.min(initialPage, totalPages));

  const makeEmbed = (page: number, pages: number) =>
    queueEmbed(player.queue.tracks, player.queue.getCurrent(), page, pages, player.queue.size, t);

  const components = totalPages > 1 ? [buildQueueRow(currentPage, totalPages)] : [];
  const silentFlag = MessageFlags.SuppressNotifications;

  let replyMsg: Message | null = null;
  if (ctx.isSlash && ctx.interaction) {
    await ctx.interaction.reply({
      embeds: [makeEmbed(currentPage, totalPages)],
      components,
      flags: silentFlag,
    });
    replyMsg = (await ctx.interaction.fetchReply()) as Message;
  } else if (ctx.message) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    replyMsg = (await (ctx.message as any).reply({
      embeds: [makeEmbed(currentPage, totalPages)],
      components,
      flags: silentFlag,
    })) as Message;
  }

  if (!replyMsg || totalPages <= 1) return;

  const collector = replyMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120_000,
  });

  collector.on('collect', async interaction => {
    if (interaction.user.id !== ctx.member.id) {
      await interaction.reply({ content: '⚠️', ephemeral: true });
      return;
    }

    await interaction.deferUpdate();

    if (interaction.customId === 'queue_prev') currentPage = Math.max(1, currentPage - 1);
    else if (interaction.customId === 'queue_next') currentPage++;

    const newTotal = player.queue.totalPages;
    currentPage = Math.max(1, Math.min(currentPage, newTotal));

    await interaction.editReply({
      embeds: [makeEmbed(currentPage, newTotal)],
      components: [buildQueueRow(currentPage, newTotal)],
    });
  });

  collector.on('end', async () => {
    try {
      const newTotal = player.queue.totalPages;
      await replyMsg!.edit({ components: [buildQueueRow(currentPage, newTotal, true)] });
    } catch {
      /* message may have been deleted */
    }
  });
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
