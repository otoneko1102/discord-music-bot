import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  type Message,
} from 'discord.js';
import type { Command, CommandContext, Track } from '../../types';
import { resolveInput, resolveQuery, detectInputType } from '../../utils/search';
import {
  loadingEmbed,
  errorEmbed,
  successEmbed,
  addedToQueueEmbed,
  nowPlayingEmbed,
  searchEmbed,
} from '../../utils/embeds';
import config from '../../config';

export function buildSlash(builder: SlashCommandBuilder): void {
  builder.addStringOption(o =>
    o
      .setName('query')
      .setDescription('Song/playlist name or URL (YouTube, Spotify, YouTube Music, SoundCloud)')
      .setRequired(true)
  );
}

async function execute(ctx: CommandContext): Promise<void> {
  const { t, player, voiceChannel, member } = ctx;

  if (!voiceChannel) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notInVoice'))], flags: 64 });
    return;
  }

  if (player.isConnected && player.voiceConnection?.joinConfig.channelId !== voiceChannel.id) {
    await ctx.reply({ embeds: [errorEmbed(t('common.notSameVoice'))], flags: 64 });
    return;
  }

  const query = ctx.isSlash ? (ctx.getString('query') ?? '') : ctx.args.join(' ');

  if (!query.trim()) {
    await ctx.reply({ embeds: [errorEmbed(t('play.noQuery'))], flags: 64 });
    return;
  }

  // For text queries → show search results to pick from
  const inputType = detectInputType(query);
  const isUrl = inputType !== 'query';

  if (!isUrl) {
    await handleSearchSelect(ctx, query, voiceChannel);
    return;
  }

  await ctx.deferReply();
  await ctx.editReply({ embeds: [loadingEmbed(t('common.loading'))] });

  try {
    // Join voice channel
    if (!player.isConnected) {
      await player.join(voiceChannel, false);
    }

    const result = await resolveInput(query, member.id);

    if (!result.tracks.length) {
      await ctx.editReply({ embeds: [errorEmbed(t('play.noResults', query))] });
      return;
    }

    if (result.tracks.length === 1) {
      const track = result.tracks[0]!;
      const status = await player.enqueue(track);

      if (status === 'playing') {
        await ctx.editReply({ embeds: [nowPlayingEmbed(track, player, t)] });
      } else {
        await ctx.editReply({ embeds: [addedToQueueEmbed(track, player.queue.size, t)] });
      }
    } else {
      // Playlist
      const limited = result.tracks.length < (result.totalCount ?? result.tracks.length);
      await player.enqueueMany(result.tracks);

      const msg = limited
        ? t('play.playlistTooLarge', config.maxPlaylistSize)
        : t('play.addedPlaylist', result.tracks.length, result.playlistTitle ?? 'Playlist');
      await ctx.editReply({ embeds: [successEmbed(msg)] });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await ctx.editReply({ embeds: [errorEmbed(t('common.error', errMsg))] });
  }
}

/** Show search results and wait for user selection */
async function handleSearchSelect(
  ctx: CommandContext,
  query: string,
  voiceChannel: NonNullable<CommandContext['voiceChannel']>
): Promise<void> {
  const { t, player, member } = ctx;

  // Send loading message and hold a reference to the reply Message for the collector
  let replyMsg: Message | null = null;

  if (ctx.isSlash && ctx.interaction) {
    await ctx.interaction.reply({
      embeds: [loadingEmbed(t('play.searching', query))],
      flags: MessageFlags.SuppressNotifications,
    });
  } else if (ctx.message) {
    replyMsg = (await ctx.message.reply({
      embeds: [loadingEmbed(t('play.searching', query))],
    })) as Message;
  }

  let results: Track[];
  try {
    results = await resolveQuery(query, member.id, config.searchResultCount);
  } catch {
    results = [];
  }

  if (!results.length) {
    const noResults = { embeds: [errorEmbed(t('play.noResults', query))], components: [] };
    if (ctx.isSlash && ctx.interaction) {
      await ctx.interaction.editReply(noResults);
    } else {
      await replyMsg?.edit(noResults);
    }
    return;
  }

  // Build number buttons (1–5) in one row, cancel in a second row
  const resultButtons = results.map((_, i) =>
    new ButtonBuilder()
      .setCustomId(`search_${i}`)
      .setLabel(`${i + 1}`)
      .setStyle(ButtonStyle.Primary)
  );
  const cancelButton = new ButtonBuilder()
    .setCustomId('search_cancel')
    .setLabel('✕')
    .setStyle(ButtonStyle.Danger);

  const resultRow = new ActionRowBuilder<ButtonBuilder>().addComponents(resultButtons);
  const cancelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(cancelButton);
  const searchContent = { embeds: [searchEmbed(results, t)], components: [resultRow, cancelRow] };

  if (ctx.isSlash && ctx.interaction) {
    await ctx.interaction.editReply(searchContent);
    replyMsg = (await ctx.interaction.fetchReply()) as Message;
  } else if (replyMsg) {
    await replyMsg.edit(searchContent);
  }

  if (!replyMsg) return;

  const collector = replyMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => i.user.id === member.id,
    time: 30_000,
    max: 1,
  });

  collector.on('collect', async i => {
    await i.deferUpdate();

    if (i.customId === 'search_cancel') {
      await i.editReply({ embeds: [errorEmbed(t('play.noResults', query))], components: [] });
      return;
    }

    const idx = parseInt(i.customId.replace('search_', ''), 10);
    const track = results[idx];
    if (!track) return;

    try {
      if (!player.isConnected) await player.join(voiceChannel, false);
      const status = await player.enqueue(track);

      if (status === 'playing') {
        await i.editReply({ embeds: [nowPlayingEmbed(track, player, t)], components: [] });
      } else {
        await i.editReply({
          embeds: [addedToQueueEmbed(track, player.queue.size, t)],
          components: [],
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await i.editReply({ embeds: [errorEmbed(t('common.error', errMsg))], components: [] });
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'time') {
      try {
        await replyMsg!.edit({ components: [] });
      } catch {
        /* message may be deleted */
      }
    }
  });
}

const command: Command = {
  name: 'play',
  aliases: ['p'],
  description: 'Play a song or playlist from YouTube, Spotify, or YouTube Music',
  descriptionJa: '曲やプレイリストを再生します',
  category: 'playback',
  usage: '<song name / URL>',
  execute,
};

export default command;
