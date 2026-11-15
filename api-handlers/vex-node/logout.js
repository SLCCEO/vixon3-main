import {
  clearOAuthStateCookie,
  clearSessionCookie,
  getVexNodeConfig,
} from '../../lib/vex-node-auth.js';

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const config = getVexNodeConfig();
  if (!config) return response.status(503).json({ error: 'VEX-NODE authentication is not configured' });

  const origin = request.headers.origin;
  if (origin !== new URL(config.redirectUri).origin) {
    return response.status(403).json({ error: 'Invalid request origin' });
  }

  clearSessionCookie(response);
  clearOAuthStateCookie(response);
  return response.status(200).json({ ok: true });
}
