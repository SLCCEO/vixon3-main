import {
  createOAuthState,
  getVexNodeConfig,
  setOAuthStateCookie,
} from '../../lib/vex-node-auth.js';

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).send('Method not allowed');
  }

  const config = getVexNodeConfig();
  if (!config) return response.status(503).send('VEX-NODE authentication is not configured.');

  const requestHost = request.headers['x-forwarded-host'] || request.headers.host;
  const requestProtocol = request.headers['x-forwarded-proto'] || 'https';
  const requestOrigin = requestHost ? `${requestProtocol.split(',')[0].trim()}://${requestHost.split(',')[0].trim()}` : '';
  const callbackOrigin = new URL(config.redirectUri).origin;
  if (requestOrigin && requestOrigin !== callbackOrigin) {
    return response.redirect(302, `${callbackOrigin}/api/vex-node/login`);
  }

  const state = createOAuthState();
  setOAuthStateCookie(response, state);

  const authorizationUrl = new URL('https://discord.com/oauth2/authorize');
  authorizationUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'identify guilds.members.read',
    state,
  }).toString();

  return response.redirect(302, authorizationUrl.toString());
}
