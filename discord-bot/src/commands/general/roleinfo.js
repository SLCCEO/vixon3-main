import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Show information about a server role.')
    .addRoleOption((option) =>
      option.setName('role').setDescription('Role to look up.').setRequired(true)),

  async execute(interaction) {
    const role = interaction.options.getRole('role', true);
    const embed = new EmbedBuilder()
      .setTitle(role.name)
      .addFields(
        { name: 'Role ID', value: role.id, inline: true },
        { name: 'Members', value: `${role.members.size}`, inline: true },
        { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: 'Position', value: `${role.position}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:D>`, inline: true }
      )
      .setColor(role.color || 0x5865f2);
    await interaction.reply({ embeds: [embed] });
  }
};
