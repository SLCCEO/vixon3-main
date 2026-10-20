import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { supabase } from '../../database/supabase.js';
import { requireStaff } from '../../utils/staff.js';

export default {
  data: new SlashCommandBuilder()
    .setName('staff-list')
    .setDescription('Show staff duty statuses, including Off Duty staff.'),

  async execute(interaction) {
    requireStaff(interaction);
    const { data, error } = await supabase
      .from('duty_status')
      .select('user_id,status')
      .order('status')
      .limit(25);
    if (error) throw error;

    const description = data?.length
      ? data.map((row) => `<@${row.user_id}> — **${row.status}**`).join('\n')
      : 'No duty statuses have been recorded yet.';
    await interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Staff Duty List').setDescription(description).setColor(0x5865f2)],
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    });
  }
};
