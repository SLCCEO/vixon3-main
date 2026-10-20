import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show information about a server member.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Member to look up; defaults to you.')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const member = interaction.guild?.members.cache.get(user.id) ?? null;
    const embed = new EmbedBuilder()
      .setTitle(user.tag)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'User ID', value: user.id, inline: true },
        { name: 'Account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
        {
          name: 'Joined server',
          value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : 'Not available',
          inline: true
        }
      )
      .setColor(0x5865f2);
    await interaction.reply({ embeds: [embed] });
  }
};
