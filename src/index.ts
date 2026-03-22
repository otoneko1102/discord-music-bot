import { Client, GatewayIntentBits, Partials } from 'discord.js';
import config from './config';
import commandHandler, { players, removePlayer } from './commands/CommandHandler';
import onReady from './events/ready';
import onMessageCreate from './events/messageCreate';
import onInteractionCreate from './events/interactionCreate';

// Validate required config
if (!config.token) {
  console.error('[Bot] DISCORD_TOKEN is not set. Please configure your .env file.');
  process.exit(1);
}
if (!config.clientId) {
  console.error('[Bot] CLIENT_ID is not set. Please configure your .env file.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
  allowedMentions: { repliedUser: false },
});

client.once('clientReady', c => onReady(c));
client.on('messageCreate', msg => onMessageCreate(msg));
client.on('interactionCreate', i => onInteractionCreate(i));

client.on('guildCreate', guild => {
  console.log(`[Bot] Joined guild: ${guild.name} (${guild.id})`);
});

client.on('guildDelete', guild => {
  console.log(`[Bot] Left guild: ${guild.name} (${guild.id})`);
  const player = players.get(guild.id);
  if (player) {
    player.destroy();
    removePlayer(guild.id);
  }
});

async function main(): Promise<void> {
  await commandHandler.load();
  await client.login(config.token);
}

main().catch(err => {
  console.error('[Bot] Fatal error:', err);
  process.exit(1);
});
