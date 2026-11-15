import { syncForumCaseThread } from '../utils/moderation-archive.js';

export default {
  name: 'messageCreate',
  async execute(message) {
    if (
      !message.guildId ||
      !message.channel.isThread() ||
      message.channel.parentId !== process.env.MODERATION_CASE_CHANNEL_ID
    ) {
      return;
    }

    try {
      await syncForumCaseThread(message.client, message.channel.id);
    } catch (error) {
      console.error(`Unable to archive moderation forum post ${message.channel.id}:`, error);
    }
  },
};
