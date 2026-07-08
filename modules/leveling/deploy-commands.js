import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';

const token = requiredEnv('DISCORD_TOKEN');
const clientId = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
if (!clientId) throw new Error('Missing DISCORD_CLIENT_ID or CLIENT_ID.');
const guildId = process.env.DISCORD_GUILD_ID;
const rest = new REST({ version: '10' }).setToken(token);
const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

console.log(`Deploying ${commands.length} slash commands...`);
await rest.put(route, { body: commands });
console.log(guildId ? `Done for guild ${guildId}.` : 'Done globally.');

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to your .env file.`);
  }
  return value;
}
