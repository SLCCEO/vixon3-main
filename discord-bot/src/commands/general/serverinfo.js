import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show information about this server.'),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) throw new Error('This command can only be used in a server.');
    const owner = await guild.fetchOwner();
    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'Owner', value: `${owner.user.tag}`, inline: true },
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Server ID', value: guild.id, inline: true }
      )
      .setColor(0x5865f2);
    await interaction.reply({ embeds: [embed] });
  }
};
