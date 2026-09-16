export default function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).send('Method not allowed');
  }

  if (!process.env.TWITCH_CLIENT_ID) {
    return response.status(503).send('TWITCH_CLIENT_ID is not configured on Vercel.');
  }

  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    redirect_uri: 'https://www.vixon.online/api/twitch/callback',
    response_type: 'code',
    scope: 'moderator:read:followers',
  });

  return response.redirect(`https://id.twitch.tv/oauth2/authorize?${params}`);
}
