import {
  clearOAuthStateCookie,
  getVexNodeConfig,
  hasValidOAuthState,
  setSessionCookie,
  verifyDiscordRole,
} from '../../lib/vex-node-auth.js';

const redirectToNode = (response, status) => response.redirect(302, `/node?auth=${status}`);

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).send('Method not allowed');
  }

  const config = getVexNodeConfig();
  if (!config) return response.status(503).send('VEX-NODE authentication is not configured.');

  const query = new URL(request.url, config.redirectUri).searchParams;
  const state = query.get('state');
  if (!hasValidOAuthState(request, state)) {
    clearOAuthStateCookie(response);
    return redirectToNode(response, 'failed');
  }

  clearOAuthStateCookie(response);
  if (query.has('error') || !query.get('code')) return redirectToNode(response, 'failed');

  try {
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code: query.get('code'),
        redirect_uri: config.redirectUri,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!tokenResponse.ok) {
      console.error('VEX-NODE Discord token exchange failed:', tokenResponse.status);
      return redirectToNode(response, 'failed');
    }

    const token = await tokenResponse.json();
    if (
      token.token_type?.toLowerCase() !== 'bearer' ||
      typeof token.access_token !== 'string' ||
      !Number.isFinite(token.expires_in) ||
      token.expires_in <= 60
    ) {
      console.error('VEX-NODE Discord token response was incomplete');
      return redirectToNode(response, 'failed');
    }

    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!userResponse.ok) {
      console.error('VEX-NODE Discord identity request failed:', userResponse.status);
      return redirectToNode(response, 'failed');
    }

    const user = await userResponse.json();
    if (typeof user.id !== 'string' || typeof user.username !== 'string') {
      console.error('VEX-NODE Discord identity response was incomplete');
      return redirectToNode(response, 'failed');
    }

    const membership = await verifyDiscordRole(token.access_token, config);
    if (membership.expired) return redirectToNode(response, 'failed');
    if (!membership.authorized && !membership.editorAuthorized) {
      return redirectToNode(response, 'denied');
    }

    const expiresAt = Date.now() + Math.min(60 * 60, token.expires_in - 60) * 1000;
    setSessionCookie(response, {
      userId: user.id,
      username: user.global_name || user.username,
      avatar: typeof user.avatar === 'string' ? user.avatar : null,
      accessToken: token.access_token,
      expiresAt,
    }, config);

    return response.redirect(302, '/node');
  } catch (error) {
    console.error('VEX-NODE Discord callback failed:', error);
    return redirectToNode(response, 'failed');
  }
}
