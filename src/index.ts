import { Client, GatewayIntentBits, Partials } from 'discord.js';
import config from './config';
import commandHandler, { players, removePlayer } from './commands/CommandHandler';
import onReady from './events/ready';
import onMessageCreate from './events/messageCreate';
import onInteractionCreate from './events/interactionCreate';
import guildManager from './core/GuildManager';
import { flushQueueState } from './utils/queuePersistence';

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

// Prevent unhandled promise rejections and uncaught exceptions from crashing the process.
// pm2 will restart the process on actual fatal errors (process.exit).
process.on('unhandledRejection', (reason) => {
  console.error('[Bot] Unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Bot] Uncaught exception:', err);
});

// Flush any debounced writes before the process exits.
function onExit(): void {
  flushQueueState();
  guildManager.flushSync();
}
process.on('SIGTERM', () => { onExit(); process.exit(0); });
process.on('SIGINT',  () => { onExit(); process.exit(0); });
process.on('beforeExit', onExit);

async function main(): Promise<void> {
  await commandHandler.load();
  await client.login(config.token);
}

main().catch(err => {
  console.error('[Bot] Fatal error:', err);
  process.exit(1);
});
