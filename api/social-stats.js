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
  if (!process.env.DISCORD_SERVICE_URL || !process.env.DISCORD_SERVICE_API_KEY) return null;
  const data = await fetchJson(`${process.env.DISCORD_SERVICE_URL.replace(/\/$/, '')}/api/stats`, {
    headers: { 'x-api-key': process.env.DISCORD_SERVICE_API_KEY },
  });
  return data.members ?? null;
};

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
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
