import { archiveDiscordBan } from '../utils/moderation-archive.js';

export default {
  name: 'guildBanAdd',
  async execute(ban) {
    if (ban.guild.id !== process.env.DISCORD_GUILD_ID) return;

    try {
      await archiveDiscordBan(ban);
    } catch (error) {
      console.error(`Unable to archive Discord ban for ${ban.user.id}:`, error);
    }
  },
};
