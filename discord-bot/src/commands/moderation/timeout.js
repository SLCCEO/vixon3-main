import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { requirePermission } from '../../utils/staff.js';

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member for up to 28 days.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName('user').setDescription('Member to timeout.').setRequired(true))
    .addIntegerOption((option) =>
      option
        .setName('minutes')
        .setDescription('Timeout duration in minutes (1–40320).')
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true))
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the timeout.').setMaxLength(1000)),

  async execute(interaction) {
    requirePermission(interaction, PermissionFlagsBits.ModerateMembers, 'Moderate Members');
    const user = interaction.options.getUser('user', true);
    const minutes = interaction.options.getInteger('minutes', true);
    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id);
    await member.timeout(minutes * 60_000, `${reason} (by ${interaction.user.tag})`);
    await interaction.reply({
      content: `Timed out <@${user.id}> for ${minutes} minute${minutes === 1 ? '' : 's'}. Reason: ${reason}`,
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    });
  }
};
