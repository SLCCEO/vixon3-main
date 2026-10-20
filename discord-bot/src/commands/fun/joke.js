import { randomInt } from 'node:crypto';
import { SlashCommandBuilder } from 'discord.js';

const jokes = [
  'Why did the developer go broke? They used up all their cache.',
  'Why do programmers prefer dark mode? Because light attracts bugs.',
  'A SQL query walks into a bar, walks up to two tables, and asks: “Can I join you?”',
  'There are 10 kinds of people: those who understand binary and those who do not.'
];

export default {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Get a programming joke.'),

  async execute(interaction) {
    await interaction.reply(jokes[randomInt(jokes.length)]);
  }
};
