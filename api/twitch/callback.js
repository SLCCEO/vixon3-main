const exchangeCode = async (code) => {
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: 'https://www.vixon.online/api/twitch/callback',
  });
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.message || 'Token exchange failed');
  return data;
};

export default async function handler(request, response) {
  const query = new URL(request.url, 'https://www.vixon.online').searchParams;
  const code = query.get('code');
  const error = query.get('error');
  const errorDescription = query.get('error_description');

  if (error) {
    return response.status(400).send(`Twitch authorization failed: ${errorDescription || error}`);
  }
  if (!code) {
    return response.status(400).send('Missing Twitch authorization code. Start the flow at https://www.vixon.online/api/twitch/login and do not open the callback URL directly.');
  }
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    return response.status(503).send('Twitch API credentials are not configured on Vercel.');
  }

  try {
    const token = await exchangeCode(code);
    return response.status(200).send(`<!doctype html><html><head><title>Twitch authorization complete</title><style>body{background:#080404;color:#eee;font:16px monospace;max-width:760px;margin:60px auto;padding:24px}code{display:block;background:#160909;border:1px solid #a00;padding:16px;word-break:break-all;color:#f88}h1{color:#f33}p{line-height:1.6}</style></head><body><h1>Twitch authorization complete</h1><p>Copy this access token into Vercel as <strong>TWITCH_ACCESS_TOKEN</strong>. Treat it like a password and do not share it publicly.</p><code>${token.access_token}</code><p>After saving the variable in Vercel, redeploy the site. You may close this page afterward.</p></body></html>`);
  } catch (exchangeError) {
    console.error('Twitch callback error:', exchangeError);
    return response.status(502).send(`Unable to exchange Twitch authorization: ${exchangeError.message}`);
  }
}
