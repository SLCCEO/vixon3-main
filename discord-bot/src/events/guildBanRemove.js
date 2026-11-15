import { markDiscordBanInactive } from '../utils/moderation-archive.js';

export default {
  name: 'guildBanRemove',
  async execute(ban) {
    if (ban.guild.id !== process.env.DISCORD_GUILD_ID) return;

    try {
      await markDiscordBanInactive(ban);
    } catch (error) {
      console.error(`Unable to update archived Discord ban for ${ban.user.id}:`, error);
    }
  },
};
