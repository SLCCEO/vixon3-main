import { requireVexNodeAccess } from '../../lib/vex-node-access.js';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const access = await requireVexNodeAccess(request, response);
  if (!access) return;

  const query = new URL(request.url, access.config.redirectUri).searchParams;
  const storagePath = query.get('path') || '';
  if (!/^\d{15,20}\/\d{15,20}\/\d{15,20}-[\w.-]+$/.test(storagePath)) {
    return response.status(400).json({ error: 'Invalid evidence path' });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return response.status(503).json({ error: 'Supabase is not configured' });
  }

  try {
    const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');
    const signEndpoint = new URL(`/storage/v1/object/sign/moderation-evidence/${encodedPath}`, SUPABASE_URL);
    const signResponse = await fetch(signEndpoint, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 300 }),
      signal: AbortSignal.timeout(5000),
    });

    if (!signResponse.ok) {
      console.error('VEX-NODE evidence signing failed:', signResponse.status);
      return response.status(502).json({ error: 'Unable to open archived evidence' });
    }

    const result = await signResponse.json();
    const signedPath = result.signedURL || result.signedUrl;
    if (typeof signedPath !== 'string') {
      return response.status(502).json({ error: 'Supabase did not return an evidence link' });
    }

    const signedUrl = /^https?:\/\//i.test(signedPath)
      ? new URL(signedPath)
      : new URL(`/storage/v1${signedPath.startsWith('/') ? signedPath : `/${signedPath}`}`, SUPABASE_URL);
    if (signedUrl.origin !== new URL(SUPABASE_URL).origin) {
      return response.status(502).json({ error: 'Supabase returned an invalid evidence link' });
    }

    return response.redirect(302, signedUrl.toString());
  } catch (error) {
    console.error('VEX-NODE evidence request failed:', error);
    return response.status(502).json({ error: 'Unable to open archived evidence' });
  }
}
