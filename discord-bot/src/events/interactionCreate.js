import { MessageFlags } from 'discord.js';

export default {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      await interaction.reply({
        content: 'This command is not available. Please contact a server administrator.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Command /${interaction.commandName} failed:`, error);
      const response = {
        content: 'The command could not be completed. Please check the bot logs or try again later.',
        flags: MessageFlags.Ephemeral
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    }
  }
};
