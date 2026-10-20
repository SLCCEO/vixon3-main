import { randomInt } from 'node:crypto';
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin.'),

  async execute(interaction) {
    await interaction.reply(randomInt(2) === 0 ? 'Heads!' : 'Tails!');
  }
};
