import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { requirePermission } from '../../utils/staff.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName('user').setDescription('Member to ban.').setRequired(true))
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the ban.').setMaxLength(1000)),

  async execute(interaction) {
    requirePermission(interaction, PermissionFlagsBits.BanMembers, 'Ban Members');
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
    await interaction.guild.members.ban(user.id, { reason: `${reason} (by ${interaction.user.tag})` });
    await interaction.reply({
      content: `Banned <@${user.id}>. Reason: ${reason}`,
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    });
  }
};
