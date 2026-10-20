import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { supabase } from '../../database/supabase.js';
import { requireStaff } from '../../utils/staff.js';

export default {
  data: new SlashCommandBuilder()
    .setName('staff-info')
    .setDescription('View a staff member’s duty status.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Staff member to look up.').setRequired(true)),

  async execute(interaction) {
    requireStaff(interaction);
    const user = interaction.options.getUser('user', true);
    const { data, error } = await supabase
      .from('duty_status')
      .select('status,updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;

    const { data: loaRequest, error: loaError } = await supabase
      .from('loa_requests')
      .select('status,reason')
      .eq('user_id', user.id)
      .maybeSingle();
    if (loaError) throw loaError;

    const updated = data?.updated_at
      ? `\nLast updated: <t:${Math.floor(new Date(data.updated_at).getTime() / 1000)}:R>`
      : '';
    const loaDetails = loaRequest
      ? `\nLOA request: **${loaRequest.status}** — ${loaRequest.reason}`
      : '';
    await interaction.reply({
      content: `Duty status for <@${user.id}>: **${data?.status ?? 'Off Duty'}**${updated}${loaDetails}`,
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    });
  }
};
