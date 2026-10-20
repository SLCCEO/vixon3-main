import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

export default {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a reaction poll with 2–10 options.')
    .addStringOption((option) =>
      option.setName('question').setDescription('Poll question.').setMaxLength(200).setRequired(true))
    .addStringOption((option) =>
      option.setName('options').setDescription('Options separated by | (for example: Red | Blue).')
        .setMaxLength(1000).setRequired(true)),

  async execute(interaction) {
    const question = interaction.options.getString('question', true).trim();
    const options = interaction.options.getString('options', true)
      .split('|')
      .map((option) => option.trim())
      .filter(Boolean);
    if (options.length < 2 || options.length > numberEmojis.length) {
      throw new Error('A poll must have between 2 and 10 non-empty options separated by |.');
    }

    const embed = new EmbedBuilder()
      .setTitle(question)
      .setDescription(options.map((option, index) => `${numberEmojis[index]} ${option}`).join('\n'))
      .setColor(0x57f287)
      .setFooter({ text: `Poll by ${interaction.user.tag}` });
    const message = await interaction.reply({
      embeds: [embed],
      allowedMentions: { parse: [] },
      fetchReply: true
    });
    for (const emoji of numberEmojis.slice(0, options.length)) {
      await message.react(emoji);
    }
  }
};
