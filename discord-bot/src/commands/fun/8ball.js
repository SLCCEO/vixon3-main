import { randomInt } from 'node:crypto';
import { SlashCommandBuilder } from 'discord.js';

const responses = [
  'Absolutely.', 'It looks likely.', 'Signs point to yes.', 'Ask again later.',
  'I cannot predict that right now.', 'Probably not.', 'The outlook is uncertain.', 'Definitely not.'
];

export default {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question.')
    .addStringOption((option) =>
      option.setName('question').setDescription('Your yes-or-no question.').setMaxLength(500).setRequired(true)),

  async execute(interaction) {
    const question = interaction.options.getString('question', true);
    await interaction.reply({
      content: `🎱 **${question}**\n${responses[randomInt(responses.length)]}`,
      allowedMentions: { parse: [] }
    });
  }
};
