import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCommands } from './utils/load-commands.js';
import { startWebsiteApi } from './api/server.js';
import { getJoinMonitoringConfig } from './utils/join-monitor.js';

const required = [
  'DISCORD_BOT_TOKEN',
  'DISCORD_GUILD_ID',
  'BOT_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

const joinMonitoringConfig = getJoinMonitoringConfig();
if (!joinMonitoringConfig.alertChannelId) {
  console.warn('MODERATION_ALERT_CHANNEL_ID is unset; join-monitor alerts will only appear in the bot console.');
}

let staffIds;
try {
  staffIds = JSON.parse(process.env.DISCORD_STAFF_IDS || '{}');
} catch (error) {
  throw new Error('DISCORD_STAFF_IDS must contain valid JSON.', { cause: error });
}
if (!staffIds || Array.isArray(staffIds) || typeof staffIds !== 'object') {
  throw new TypeError('DISCORD_STAFF_IDS must be a JSON object mapping display names to Discord user IDs.');
}

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});
client.commands = new Collection();

const commands = await loadCommands(path.join(rootDirectory, 'commands'));
for (const command of commands) {
  if (client.commands.has(command.data.name)) {
    throw new Error(`Duplicate command name: ${command.data.name}`);
  }
  client.commands.set(command.data.name, command);
}

const eventsDirectory = path.join(rootDirectory, 'events');
const eventNames = await readdir(eventsDirectory);
for (const eventName of eventNames.filter((name) => name.endsWith('.js')).sort()) {
  const eventPath = pathToFileURL(path.join(eventsDirectory, eventName)).href;
  const event = (await import(eventPath)).default;
  if (!event?.name || typeof event.execute !== 'function') {
    throw new TypeError(`Invalid event module: ${eventName}`);
  }

  const handler = (...args) => event.execute(...args);
  client[event.once ? 'once' : 'on'](event.name, handler);
}

const server = startWebsiteApi(client, staffIds);
client.once('clientReady', () => {
  console.info(`Discord bot ready as ${client.user.tag}`);
});

try {
  await client.login(process.env.DISCORD_BOT_TOKEN);
} catch (error) {
  server.close();
  throw error;
}
