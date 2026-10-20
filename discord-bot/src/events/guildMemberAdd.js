import { EmbedBuilder } from 'discord.js';
import {
  getJoinMonitoringConfig,
  isNewAccount,
  recordGuildJoin
} from '../utils/join-monitor.js';

let missingAlertChannelWarned = false;

async function sendAlert(member, embed, channelId) {
  if (!channelId) {
    if (!missingAlertChannelWarned) {
      console.warn('Join monitoring is active but MODERATION_ALERT_CHANNEL_ID is unset; alerts are only logged to the bot console.');
      missingAlertChannelWarned = true;
    }
    console.warn(`[Join monitor] ${member.user.tag} (${member.id}) joined ${member.guild.name}: ${embed.data.description}`);
    return;
  }

  try {
    const channel = await member.guild.channels.fetch(channelId);
    if (!channel || channel.guildId !== member.guild.id || !channel.isTextBased()) {
      throw new Error('Configured moderation alert channel was not found as a text channel in this server.');
    }

    await channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] }
    });
  } catch (error) {
    console.error(`Unable to post a join-monitor alert in channel ${channelId}:`, error);
  }
}

export default {
  name: 'guildMemberAdd',
  async execute(_client, member) {
    if (member.guild.id !== process.env.DISCORD_GUILD_ID) return;

    const config = getJoinMonitoringConfig();
    const now = Date.now();
    const accountAgeMs = now - member.user.createdTimestamp;
    const alerts = [];

    if (isNewAccount(member.user.createdTimestamp, now, config.minimumAccountAgeMs)) {
      const ageHours = Math.max(0, Math.floor(accountAgeMs / (60 * 60 * 1000)));
      const ageDescription = ageHours < 24
        ? `${ageHours} hour${ageHours === 1 ? '' : 's'}`
        : `${Math.floor(ageHours / 24)} day${Math.floor(ageHours / 24) === 1 ? '' : 's'}`;
      alerts.push(new EmbedBuilder()
        .setTitle('New account joined')
        .setDescription(`<@${member.id}> joined with an account approximately ${ageDescription} old.`)
        .addFields(
          { name: 'Account created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>` },
          { name: 'Review note', value: 'Account age is only a review signal. No automatic action was taken.' }
        )
        .setColor(0xf0b232)
        .setTimestamp());
    }

    const joinSpike = recordGuildJoin(
      member.guild.id,
      now,
      config.joinSpikeThreshold,
      config.joinSpikeWindowMs
    );
    if (joinSpike.shouldAlert) {
      alerts.push(new EmbedBuilder()
        .setTitle('Possible join raid')
        .setDescription(
          `${joinSpike.count} members joined within ${Math.round(config.joinSpikeWindowMs / 1000)} seconds (alert threshold: ${config.joinSpikeThreshold}).`
        )
        .addFields({ name: 'Review note', value: 'Join volume is only a review signal. No automatic action was taken.' })
        .setColor(0xed4245)
        .setTimestamp());
    }

    for (const alert of alerts) {
      await sendAlert(member, alert, config.alertChannelId);
    }
  }
};
