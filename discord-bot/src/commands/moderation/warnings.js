import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { supabase } from '../../database/supabase.js';
import { requirePermission, requireStaff } from '../../utils/staff.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('List a member’s recent warnings and total warning count.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName('user').setDescription('Member whose warnings to view.').setRequired(true)),

  async execute(interaction) {
    requireStaff(interaction);
    requirePermission(interaction, PermissionFlagsBits.ModerateMembers, 'Moderate Members');
    const user = interaction.options.getUser('user', true);
    const { data, error, count } = await supabase
      .from('warnings')
      .select('id,reason,created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;

    const description = data?.length
      ? data.map((warning) =>
        `**#${warning.id}** — ${warning.reason}\n<t:${Math.floor(new Date(warning.created_at).getTime() / 1000)}:R>`
      ).join('\n\n')
      : 'No warnings recorded.';
    const embed = new EmbedBuilder()
      .setTitle(`Warnings for ${user.tag}`)
      .setDescription(description)
      .setFooter({ text: `${count ?? 0} total warning${count === 1 ? '' : 's'}; showing up to 10 most recent.` })
      .setColor(0xed4245);
    await interaction.reply({
      embeds: [embed],
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    });
  }
};
