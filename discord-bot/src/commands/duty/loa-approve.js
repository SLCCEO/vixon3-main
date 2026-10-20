import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { supabase } from '../../database/supabase.js';
import { requireLoaApproverOrStaff } from '../../utils/staff.js';

export default {
  data: new SlashCommandBuilder()
    .setName('loa-approve')
    .setDescription('Approve a pending leave of absence request.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Staff member whose request to approve.').setRequired(true)),

  async execute(interaction) {
    requireLoaApproverOrStaff(interaction);
    const user = interaction.options.getUser('user', true);
    const { data, error } = await supabase.rpc('review_loa_request', {
      p_user_id: user.id,
      p_approved: true
    });
    if (error) throw error;

    await interaction.reply({
      content: data
        ? `Approved <@${user.id}>'s LOA request; their status is now **On LOA**.`
        : `<@${user.id}> has no pending LOA request to approve.`,
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    });
  }
};
