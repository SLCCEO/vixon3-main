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

const fetchTwitchData = async (appToken) => {
  const profileHeaders = {
    Authorization: `Bearer ${appToken}`,
    'Client-Id': process.env.TWITCH_CLIENT_ID,
  };
  const usersQuery = streamerLogins.map((login) => `login=${encodeURIComponent(login)}`).join('&');
  const usersResponse = await fetch(`https://api.twitch.tv/helix/users?${usersQuery}`, { headers: profileHeaders });
  if (!usersResponse.ok) throw new Error('Twitch profile lookup failed');
  const users = (await usersResponse.json()).data || [];

  return Promise.all(users.map(async (user) => {
    let followersData = {};
    if (process.env.TWITCH_ACCESS_TOKEN) {
      const followersResponse = await fetch(
        `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(user.id)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`,
            'Client-Id': process.env.TWITCH_CLIENT_ID,
          },
        },
      );
      followersData = followersResponse.ok ? await followersResponse.json() : {};
    }
    return {
      login: user.login,
      displayName: user.display_name,
      profileImageUrl: user.profile_image_url,
      followers: followersData.total ?? null,
      url: `https://www.twitch.tv/${user.login}`,
    };
  }));
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    return response.status(503).json({ error: 'Twitch API is not configured' });
  }

  try {
    const token = await getTwitchToken();
    const streamers = await fetchTwitchData(token);
    return response.status(200).json({ streamers });
  } catch (error) {
    console.error('Twitch API error:', error);
    return response.status(502).json({ error: 'Unable to load Twitch data' });
  }
}
