import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { requirePermission } from '../../utils/staff.js';

export default {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove a member’s timeout.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName('user').setDescription('Member whose timeout to remove.').setRequired(true))
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for removing the timeout.').setMaxLength(1000)),

  async execute(interaction) {
    requirePermission(interaction, PermissionFlagsBits.ModerateMembers, 'Moderate Members');
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id);
    await member.timeout(null, `${reason} (by ${interaction.user.tag})`);
    await interaction.reply({
      content: `Removed the timeout for <@${user.id}>.`,
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    });
  }
};
