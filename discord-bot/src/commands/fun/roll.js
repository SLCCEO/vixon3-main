import { randomInt } from 'node:crypto';
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll one or more dice.')
    .addIntegerOption((option) =>
      option.setName('count').setDescription('Number of dice (1–20).').setMinValue(1).setMaxValue(20))
    .addIntegerOption((option) =>
      option.setName('sides').setDescription('Sides per die (2–1000).').setMinValue(2).setMaxValue(1000)),

  async execute(interaction) {
    const count = interaction.options.getInteger('count') ?? 1;
    const sides = interaction.options.getInteger('sides') ?? 6;
    const rolls = Array.from({ length: count }, () => randomInt(1, sides + 1));
    await interaction.reply(`🎲 ${rolls.join(', ')} — total: **${rolls.reduce((sum, value) => sum + value, 0)}**`);
  }
};
