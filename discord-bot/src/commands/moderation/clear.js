import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { requirePermission } from '../../utils/staff.js';

export default {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete a number of recent messages in this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1–100).')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)),

  async execute(interaction) {
    requirePermission(interaction, PermissionFlagsBits.ManageMessages, 'Manage Messages');
    const amount = interaction.options.getInteger('amount', true);
    const deleted = await interaction.channel.bulkDelete(amount, true);
    await interaction.reply({
      content: `Deleted ${deleted.size} message${deleted.size === 1 ? '' : 's'}. Messages older than 14 days are skipped.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
