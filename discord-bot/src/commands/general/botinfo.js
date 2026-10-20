import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Show bot uptime and runtime information.'),

  async execute(interaction) {
    const client = interaction.client;
    const embed = new EmbedBuilder()
      .setTitle(`${client.user.username} — Bot Info`)
      .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Uptime', value: `<t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`, inline: true },
        { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
        { name: 'Discord.js', value: '14.x', inline: true }
      )
      .setColor(0x5865f2);
    await interaction.reply({ embeds: [embed] });
  }
};
