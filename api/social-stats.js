const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Social API request failed: ${response.status}`);
  return response.json();
};

const getYoutubeSubscribers = async () => {
  if (!process.env.YOUTUBE_API_KEY || !process.env.YOUTUBE_CHANNEL_ID) return null;
  const params = new URLSearchParams({
    part: 'statistics',
    id: process.env.YOUTUBE_CHANNEL_ID,
    key: process.env.YOUTUBE_API_KEY,
  });
  const data = await fetchJson(`https://www.googleapis.com/youtube/v3/channels?${params}`);
  const count = data.items?.[0]?.statistics?.subscriberCount;
  return count ? Number(count) : null;
};

const getTiktokFollowers = async () => {
  if (!process.env.TIKTOK_ACCESS_TOKEN) return null;
  const data = await fetchJson('https://open.tiktokapis.com/v2/user/info/?fields=user_description,follower_count', {
    headers: { Authorization: `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}` },
  });
  const count = data.data?.user?.follower_count;
  return Number.isFinite(count) ? count : null;
};

const getDiscordMembers = async () => {
  if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) return null;
  const data = await fetchJson(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}?with_counts=true`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });
  return data.approximate_member_count ?? data.member_count ?? null;
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const [youtubeSubscribers, tiktokFollowers, discordMembers] = await Promise.allSettled([
    getYoutubeSubscribers(),
    getTiktokFollowers(),
    getDiscordMembers(),
  ]);

  return response.status(200).json({
    youtubeSubscribers: youtubeSubscribers.status === 'fulfilled' ? youtubeSubscribers.value : null,
    tiktokFollowers: tiktokFollowers.status === 'fulfilled' ? tiktokFollowers.value : null,
    discordMembers: discordMembers.status === 'fulfilled' ? discordMembers.value : null,
  });
}
