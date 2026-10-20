import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { supabase } from '../../database/supabase.js';
import { notifyLoaApprovers } from '../../utils/loa-notifications.js';
import { requireStaff } from '../../utils/staff.js';

const statuses = new Set(['On Duty', 'Off Duty', 'LOA Pending', 'On LOA']);

async function setDutyStatus(userId, status) {
  const { error } = await supabase
    .from('duty_status')
    .upsert({ user_id: userId, status, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export default {
  data: new SlashCommandBuilder()
    .setName('duty')
    .setDescription('Manage staff duty status and leave requests.')
    .addSubcommand((subcommand) =>
      subcommand.setName('on').setDescription('Set your status to On Duty.'))
    .addSubcommand((subcommand) =>
      subcommand.setName('off').setDescription('Set your status to Off Duty.'))
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('View your current duty status.'))
    .addSubcommand((subcommand) =>
      subcommand.setName('list').setDescription('List staff who are not Off Duty.'))
    .addSubcommand((subcommand) =>
      subcommand
        .setName('loa')
        .setDescription('Submit a leave of absence request.')
        .addStringOption((option) =>
          option.setName('reason').setDescription('Reason for your leave request.').setMaxLength(1000)))
    .addSubcommand((subcommand) =>
      subcommand.setName('clear').setDescription('Clear your LOA request and set yourself Off Duty.')),

  async execute(interaction) {
    requireStaff(interaction);
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (subcommand === 'on' || subcommand === 'off') {
      const status = subcommand === 'on' ? 'On Duty' : 'Off Duty';
      await setDutyStatus(userId, status);
      await interaction.reply({ content: `Your duty status is now **${status}**.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === 'status') {
      const { data, error } = await supabase
        .from('duty_status')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;

      const status = data?.status ?? 'Off Duty';
      if (!statuses.has(status)) throw new Error(`Unexpected duty status: ${status}`);
      await interaction.reply({ content: `Your duty status is **${status}**.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === 'list') {
      const { data, error } = await supabase
        .from('duty_status')
        .select('user_id,status')
        .neq('status', 'Off Duty')
        .order('status')
        .limit(25);
      if (error) throw error;

      const embed = new EmbedBuilder()
        .setTitle('Active Staff Duty Statuses')
        .setDescription(data?.length
          ? data.map((row) => `<@${row.user_id}> — **${row.status}**`).join('\n')
          : 'No staff are currently On Duty or on leave.')
        .setColor(0x5865f2);
      await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
      return;
    }

    if (subcommand === 'loa') {
      const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
      const { error } = await supabase.rpc('submit_loa_request', {
        p_user_id: userId,
        p_user_tag: interaction.user.tag,
        p_reason: reason
      });
      if (error) throw error;

      const notifications = await notifyLoaApprovers(interaction.client, {
        requesterId: userId,
        requesterTag: interaction.user.tag,
        reason
      });
      const notificationSummary = [
        notifications.notifiedNames.length
          ? `Approvers notified by DM: ${notifications.notifiedNames.join(', ')}.`
          : '',
        notifications.failedNames.length
          ? `Could not notify: ${notifications.failedNames.join(', ')}. Check their IDs in DISCORD_STAFF_IDS and ensure they allow DMs.`
          : ''
      ].filter(Boolean).join('\n');

      await interaction.reply({
        content: [
          'Your LOA request was submitted and your duty status is now **LOA Pending**.',
          notificationSummary
        ].filter(Boolean).join('\n'),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'clear') {
      const { error } = await supabase.rpc('clear_loa_request', { p_user_id: userId });
      if (error) throw error;
      await interaction.reply({
        content: 'Your LOA request was cleared and your duty status is now **Off Duty**.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
