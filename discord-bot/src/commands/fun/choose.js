import { randomInt } from 'node:crypto';
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Choose randomly from comma-separated options.')
    .addStringOption((option) =>
      option.setName('options').setDescription('Provide at least two options, separated by commas.')
        .setMaxLength(1000).setRequired(true)),

  async execute(interaction) {
    const options = interaction.options.getString('options', true)
      .split(',')
      .map((option) => option.trim())
      .filter(Boolean);
    if (options.length < 2) throw new Error('Provide at least two comma-separated options.');
    await interaction.reply({
      content: `I choose: **${options[randomInt(options.length)]}**`,
      allowedMentions: { parse: [] }
    });
  }
};
