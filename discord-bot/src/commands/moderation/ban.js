import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { requirePermission } from '../../utils/staff.js';
import { tryRecordModerationAction } from '../../utils/moderation-archive.js';

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
    const archived = await tryRecordModerationAction(interaction, { action: 'ban', user, reason });
    await interaction.reply({
      content: `Banned <@${user.id}>. Reason: ${reason}${archived ? '' : '\nThe ban succeeded, but its case archive write failed. Notify an administrator.'}`,
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    });
  }
};
