import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { requirePermission } from '../../utils/staff.js';
import { tryRecordModerationAction } from '../../utils/moderation-archive.js';

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
    const archived = await tryRecordModerationAction(interaction, { action: 'kick', user, reason });
    await interaction.reply({
      content: `Kicked <@${user.id}>. Reason: ${reason}${archived ? '' : '\nThe kick succeeded, but its case archive write failed. Notify an administrator.'}`,
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    });
  }
};
