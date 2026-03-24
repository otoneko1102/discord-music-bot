import type { Client, TextChannel, NewsChannel, VoiceChannel, StageChannel } from 'discord.js';
import commandHandler, { getPlayer } from '../commands/CommandHandler';
import guildManager from '../core/GuildManager';
import { loadAllQueueStates, clearQueueState } from '../utils/queuePersistence';

/** Queue states older than this are discarded on restore (6 hours). */
const QUEUE_STATE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export default async function onReady(client: Client<true>): Promise<void> {
  console.log(`[Bot] Logged in as ${client.user.tag}`);
  console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);

  client.user.setPresence({
    activities: [{ name: '.help | Music Bot' }],
    status: 'online',
  });

  await commandHandler.registerSlashCommands(client);

  // --- Queue / VC restore on startup ---
  // Tracks which guilds were already handled by queue restore (skip 24/7 rejoin for those).
  const restoredGuilds = new Set<string>();

  const allStates = loadAllQueueStates();
  for (const [guildId, state] of Object.entries(allStates)) {
    // Discard stale states
    if (Date.now() - state.savedAt > QUEUE_STATE_MAX_AGE_MS) {
      clearQueueState(guildId);
      continue;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      clearQueueState(guildId);
      continue;
    }

    try {
      const channel = await client.channels.fetch(state.voiceChannelId);
      if (!channel || !channel.isVoiceBased()) {
        clearQueueState(guildId);
        continue;
      }

      const player = getPlayer(guildId);
      await player.join(channel as VoiceChannel | StageChannel, false);

      // Restore text channel for notifications
      if (state.textChannelId) {
        const tc = guild.channels.cache.get(state.textChannelId);
        if (tc?.isTextBased()) {
          player.textChannel = tc as TextChannel | NewsChannel;
        }
      }

      player.setVolume(state.volume);
      player.loopMode = state.loopMode;
      player.autoplay = state.autoplay;

      if (state.isLofi) {
        await player.setLofi(true);
        console.log(`[Bot] Restored lofi mode in "${guild.name}"`);
      } else {
        const tracksToRestore = [
          ...(state.currentTrack ? [state.currentTrack] : []),
          ...state.tracks,
        ];
        if (tracksToRestore.length > 0) {
          await player.enqueueMany(tracksToRestore);
          console.log(
            `[Bot] Restored queue (${tracksToRestore.length} tracks) in "${guild.name}"`,
          );
        }
      }

      restoredGuilds.add(guildId);
      clearQueueState(guildId); // Will be re-saved on first track play
    } catch (err) {
      console.error(`[Bot] Failed to restore queue for guild "${guildId}":`, err);
      clearQueueState(guildId);
    }
  }

  // --- 24/7 rejoin for guilds not already restored ---
  for (const [guildId, guild] of client.guilds.cache) {
    if (restoredGuilds.has(guildId)) continue;

    const settings = guildManager.get(guildId);
    if (!settings.stay247 || !settings.voiceChannelId) continue;

    try {
      const channel = await client.channels.fetch(settings.voiceChannelId);
      if (!channel || !channel.isVoiceBased()) {
        guildManager.set(guildId, { voiceChannelId: null });
        continue;
      }

      const player = getPlayer(guildId);
      await player.join(channel as VoiceChannel | StageChannel);

      if (settings.lofi) {
        await player.setLofi(true);
        console.log(`[Bot] Auto-rejoined and resumed lofi in "${guild.name}"`);
      } else {
        console.log(`[Bot] Auto-rejoined voice channel in "${guild.name}"`);
      }
    } catch (err) {
      console.error(`[Bot] Failed to auto-rejoin guild "${guild.name}":`, err);
      guildManager.set(guildId, { voiceChannelId: null });
    }
  }
}
