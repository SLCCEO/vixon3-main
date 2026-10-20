import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show a user’s profile picture.')
    .addUserOption((option) =>
      option.setName('user').setDescription('User whose avatar to show.')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const avatarUrl = user.displayAvatarURL({ size: 1024 });
    await interaction.reply({
      content: `[${user.tag}’s avatar](${avatarUrl})`,
      embeds: [{ image: { url: avatarUrl }, color: 0x5865f2 }]
    });
  }
};
