import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REST, Routes } from 'discord.js';
import { loadCommands } from './src/utils/load-commands.js';

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
if (!token || !clientId) {
  throw new Error('DISCORD_BOT_TOKEN and CLIENT_ID must be set before deploying commands.');
}

const commandsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'src', 'commands');
const commands = await loadCommands(commandsDirectory);
const payload = commands.map((command) => command.data.toJSON());
const rest = new REST({ version: '10' }).setToken(token);
const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;

if (guildId) {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: payload });
  await rest.put(Routes.applicationCommands(clientId), { body: [] });
  console.info(`Deployed ${payload.length} guild commands to ${guildId} and cleared global commands.`);
} else {
  await rest.put(Routes.applicationCommands(clientId), { body: payload });
  console.info(`Deployed ${payload.length} global commands.`);
}
