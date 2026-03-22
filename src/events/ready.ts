import type { Client, VoiceChannel, StageChannel } from 'discord.js';
import commandHandler, { getPlayer } from '../commands/CommandHandler';
import guildManager from '../core/GuildManager';

export default async function onReady(client: Client<true>): Promise<void> {
  console.log(`[Bot] Logged in as ${client.user.tag}`);
  console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);

  client.user.setPresence({
    activities: [{ name: '.help | Music Bot' }],
    status: 'online',
  });

  await commandHandler.registerSlashCommands(client);

  // Auto-rejoin voice channels for guilds with 24/7 mode enabled
  for (const [guildId, guild] of client.guilds.cache) {
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
