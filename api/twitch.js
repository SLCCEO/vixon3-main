const streamerLogins = [
  'vexoncore',
  'ladychaosvtuber',
  'chloepanzer',
  'skylord2098',
  'zephiezephira',
  'deelexic',
  'duhgobby',
];

const getTwitchToken = async () => {
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    grant_type: 'client_credentials',
  });
  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}` , { method: 'POST' });
  if (!response.ok) throw new Error('Twitch authentication failed');
  const data = await response.json();
  return data.access_token;
};

const refreshTwitchUserToken = async () => {
  if (process.env.TWITCH_REFRESH_TOKEN) {
    const params = new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: process.env.TWITCH_REFRESH_TOKEN,
    });
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    if (!response.ok) throw new Error('Twitch user token refresh failed');
    return (await response.json()).access_token;
  }
  return null;
};

const getFollowerData = async (userId, userToken) => {
  if (!userToken) return { data: {}, needsRefresh: false };
  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID,
        },
      },
    );
    if (!response.ok) return { data: {}, needsRefresh: response.status === 401 };
    return { data: await response.json(), needsRefresh: false };
  } catch (error) {
    console.error('Twitch follower lookup failed:', error);
    return { data: {}, needsRefresh: false };
  }
};

const fetchTwitchData = async (appToken, userToken) => {
  const profileHeaders = {
    Authorization: `Bearer ${appToken}`,
    'Client-Id': process.env.TWITCH_CLIENT_ID,
  };
  const usersQuery = streamerLogins.map((login) => `login=${encodeURIComponent(login)}`).join('&');
  const usersResponse = await fetch(`https://api.twitch.tv/helix/users?${usersQuery}`, { headers: profileHeaders });
  if (!usersResponse.ok) throw new Error('Twitch profile lookup failed');
  const users = (await usersResponse.json()).data || [];

  return Promise.all(users.map(async (user) => {
    const followerResult = await getFollowerData(user.id, userToken);
    return {
      login: user.login,
      displayName: user.display_name,
      profileImageUrl: user.profile_image_url,
      followers: followerResult.data.total ?? null,
      needsRefresh: followerResult.needsRefresh,
      url: `https://www.twitch.tv/${user.login}`,
    };
  }));
};

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    return response.status(503).json({ error: 'Twitch API is not configured' });
  }

  try {
    const appToken = await getTwitchToken();
    let userToken = process.env.TWITCH_ACCESS_TOKEN || null;
    let streamers = await fetchTwitchData(appToken, userToken);

    const needsRefresh = streamers.some((streamer) => streamer.needsRefresh);
    if (needsRefresh && process.env.TWITCH_REFRESH_TOKEN) {
      const refreshedToken = await refreshTwitchUserToken().catch((refreshError) => {
        console.error('Twitch user token refresh failed:', refreshError);
        return null;
      });
      if (refreshedToken) {
        userToken = refreshedToken;
        streamers = await fetchTwitchData(appToken, userToken);
      }
    }

    return response.status(200).json({
      streamers: streamers.map(({ needsRefresh: _needsRefresh, ...streamer }) => streamer),
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Twitch API error:', error);
    return response.status(502).json({ error: 'Unable to load Twitch data' });
  }
}
