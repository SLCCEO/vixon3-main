import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { supabase } from '../../database/supabase.js';
import { requirePermission, requireStaff } from '../../utils/staff.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Record a warning for a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName('user').setDescription('Member to warn.').setRequired(true))
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the warning.').setMaxLength(1000).setRequired(true)),

  async execute(interaction) {
    requireStaff(interaction);
    requirePermission(interaction, PermissionFlagsBits.ModerateMembers, 'Moderate Members');
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true).trim();
    if (!reason) throw new Error('A warning reason cannot be empty.');

    const { data: warning, error: insertError } = await supabase
      .from('warnings')
      .insert({ user_id: user.id, reason })
      .select('id')
      .single();
    if (insertError) throw insertError;

    const { count, error: countError } = await supabase
      .from('warnings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (countError) throw countError;

    await interaction.reply({
      content: `Recorded warning #${warning.id} for <@${user.id}>. They now have **${count ?? 0}** warning${count === 1 ? '' : 's'}. Reason: ${reason}`,
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    });
  }
};
