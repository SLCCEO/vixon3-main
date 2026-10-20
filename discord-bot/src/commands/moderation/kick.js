import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { requirePermission } from '../../utils/staff.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option.setName('user').setDescription('Member to kick.').setRequired(true))
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the kick.').setMaxLength(1000)),

  async execute(interaction) {
    requirePermission(interaction, PermissionFlagsBits.KickMembers, 'Kick Members');
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id);
    await member.kick(`${reason} (by ${interaction.user.tag})`);
    await interaction.reply({
      content: `Kicked <@${user.id}>. Reason: ${reason}`,
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    });
  }
};
