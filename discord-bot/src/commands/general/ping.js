import { MessageFlags, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot and Discord API latency.'),

  async execute(interaction) {
    await interaction.reply({
      content: `Pong! WebSocket: ${interaction.client.ws.ping} ms.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
