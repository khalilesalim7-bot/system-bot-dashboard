import 'dotenv/config';
import { createRequire } from 'node:module';
import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  REST,
  Routes
} from 'discord.js';
import { commands as levelingCommands } from './modules/leveling/commands.js';
import { registerLeveling } from './modules/leveling/index.js';

const require = createRequire(import.meta.url);
const { registerTicket } = require('./modules/ticket/index.cjs');
const { registerSystem } = require('./modules/system/index.cjs');
const { registerVerification } = require('./modules/verification/index.cjs');
const { registerBooster, slashCommands: boosterSlashCommands } = require('./modules/booster/index.cjs');
const { registerSpyGame } = require('./modules/spy/index.cjs');
const { registerGifPermission } = require('./modules/gif-permission/index.cjs');
const { registerWelcome } = require('./modules/welcome/index.cjs');

const transientNetworkCodes = new Set([
  'EAI_AGAIN',
  'ETIMEDOUT',
  'ECONNRESET',
  'ENOTFOUND',
  'UND_ERR_CONNECT_TIMEOUT'
]);

function isTransientNetworkError(error) {
  const message = String(error?.message || error || '');
  return transientNetworkCodes.has(error?.code) ||
    message.includes('Opening handshake has timed out') ||
    message.includes('Connect Timeout Error') ||
    message.includes('getaddrinfo');
}

function reportProcessError(label, error) {
  if (isTransientNetworkError(error)) {
    console.warn(`${label}: temporary Discord/network issue: ${error?.message || error}`);
    return;
  }

  console.error(`${label}:`, error);
}

process.on('unhandledRejection', (error) => {
  reportProcessError('Unhandled Rejection', error);
});

process.on('uncaughtException', (error) => {
  reportProcessError('Uncaught Exception', error);
});

const token = requiredEnv('DISCORD_TOKEN');
const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
});

client.on('error', (error) => {
  reportProcessError('Discord client error', error);
});

client.on('shardError', (error) => {
  reportProcessError('Discord shard error', error);
});

registerTicket(client);
registerSystem(client);
registerVerification(client);
registerLeveling(client);
registerBooster(client);
registerSpyGame(client);
registerGifPermission(client);
registerWelcome(client);

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Combined bot online as ${readyClient.user.tag}`);
  await deploySlashCommands(readyClient).catch((error) => {
    console.warn(`Slash command deploy skipped: ${error.message}`);
  });

  // auto-send confession panels
  const { sendGirlsPanel } = require('./modules/system/commands/girlsconfesspanel.js');
  sendGirlsPanel(readyClient).catch(() => {});
  const { sendConfessionPanel } = require('./modules/system/commands/confesspanel.js');
  sendConfessionPanel(readyClient).catch(() => {});
});

await client.login(token);

async function deploySlashCommands(readyClient) {
  const rest = new REST({ version: '10' }).setToken(token);
  const applicationId = readyClient.application.id;
  const commands = [...levelingCommands, ...boosterSlashCommands()];
  const targetGuildIds = guildId && readyClient.guilds.cache.has(guildId)
    ? [guildId]
    : [...readyClient.guilds.cache.keys()];

  if (targetGuildIds.length === 0) throw new Error('bot is not in any guild');

  for (const targetGuildId of targetGuildIds) {
    try {
      await rest.put(Routes.applicationGuildCommands(applicationId, targetGuildId), { body: commands });
      console.log(`Deployed ${commands.length} slash commands for guild ${targetGuildId}.`);
    } catch (error) {
      console.warn(`Could not deploy slash commands for guild ${targetGuildId}: ${error.message}`);
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to your .env file.`);
  }
  return value;
}
