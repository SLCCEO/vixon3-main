import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { supabase } from '../../database/supabase.js';
import { requirePermission, requireStaff } from '../../utils/staff.js';

async function postWarningAuditLog(interaction, { user, removedCount, warningId }) {
  const channelId = process.env.MODERATION_ALERT_CHANNEL_ID;
  if (!channelId) {
    return { posted: false, reason: 'MODERATION_ALERT_CHANNEL_ID is not configured.' };
  }

  const channel = await interaction.guild.channels.fetch(channelId);
  if (!channel || channel.guildId !== interaction.guildId || !channel.isTextBased()) {
    return { posted: false, reason: 'The configured moderation log channel is unavailable or is not a text channel in this server.' };
  }

  const details = warningId ? `Removed warning #${warningId}.` : `Removed ${removedCount} warning${removedCount === 1 ? '' : 's'}.`;
  const embed = new EmbedBuilder()
    .setTitle('Warning record(s) removed')
    .setDescription(details)
    .addFields(
      { name: 'Member', value: `${user.tag} (${user.id})` },
      { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})` }
    )
    .setColor(0xfee75c)
    .setTimestamp();

  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  return { posted: true };
}

export default {
  data: new SlashCommandBuilder()
    .setName('warn-clear')
    .setDescription('Remove warning records from the bot database.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('one')
        .setDescription('Remove one warning by its ID.')
        .addUserOption((option) =>
          option.setName('user').setDescription('Member whose warning to remove.').setRequired(true))
        .addStringOption((option) =>
          option.setName('warning-id').setDescription('ID shown by /warnings.').setRequired(true)))
    .addSubcommand((subcommand) =>
      subcommand
        .setName('all')
        .setDescription('Remove all bot warning records for a member.')
        .addUserOption((option) =>
          option.setName('user').setDescription('Member whose warnings to clear.').setRequired(true))),

  async execute(interaction) {
    requireStaff(interaction);
    requirePermission(interaction, PermissionFlagsBits.ModerateMembers, 'Moderate Members');

    const user = interaction.options.getUser('user', true);
    const subcommand = interaction.options.getSubcommand();
    let removedCount;
    let warningId;

    if (subcommand === 'one') {
      warningId = interaction.options.getString('warning-id', true).trim();
      if (!/^\d{1,19}$/.test(warningId)) {
        throw new Error('Warning ID must be a positive numeric ID shown by /warnings.');
      }

      const { data, error } = await supabase
        .from('warnings')
        .delete()
        .eq('id', warningId)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      removedCount = data ? 1 : 0;
    } else {
      const { count, error } = await supabase
        .from('warnings')
        .delete({ count: 'exact' })
        .eq('user_id', user.id);
      if (error) throw error;
      if (count === null) {
        throw new Error('Supabase did not return the warning deletion count.');
      }
      removedCount = count;
    }

    if (removedCount === 0) {
      await interaction.reply({
        content: subcommand === 'one'
          ? `Warning #${warningId} was not found for <@${user.id}>.`
          : `<@${user.id}> has no warning records to clear.`,
        allowedMentions: { parse: [] },
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    let auditResult;
    try {
      auditResult = await postWarningAuditLog(interaction, { user, removedCount, warningId });
    } catch (error) {
      console.error('Warnings were deleted from Supabase, but the Discord audit log could not be posted:', error);
      auditResult = { posted: false, reason: 'The bot could not post to the configured audit channel.' };
    }

    await interaction.reply({
      content: [
        subcommand === 'one'
          ? `Removed warning #${warningId} for <@${user.id}> from the bot database.`
          : `Removed **${removedCount}** warning${removedCount === 1 ? '' : 's'} for <@${user.id}> from the bot database.`,
        auditResult.posted
          ? 'The action was recorded in the moderation log.'
          : `The database change succeeded, but no Discord audit log was posted: ${auditResult.reason}`
      ].join('\n'),
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    });
  }
};
