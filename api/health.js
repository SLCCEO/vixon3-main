import { timingSafeEqual } from 'node:crypto';

const isAuthorized = (request, secret) => {
  const authorization = request.headers.authorization;
  if (typeof authorization !== 'string') return false;

  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return false;

  const provided = Buffer.from(match[1]);
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
};

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!CRON_SECRET) {
    return response.status(503).json({ error: 'Heartbeat service is not configured' });
  }

  if (!isAuthorized(request, CRON_SECRET)) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return response.status(503).json({ error: 'Heartbeat database is not configured' });
  }

  const lastSeenAt = new Date().toISOString();

  try {
    const endpoint = new URL('/rest/v1/system_heartbeat', SUPABASE_URL);
    endpoint.searchParams.set('on_conflict', 'service');

    const databaseResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ service: 'vexon-website', last_seen_at: lastSeenAt }),
    });

    if (!databaseResponse.ok) {
      console.error('Supabase heartbeat write failed:', databaseResponse.status, await databaseResponse.text());
      return response.status(502).json({ error: 'Heartbeat database write failed' });
    }

    return response.status(200).json({ ok: true, lastSeenAt });
  } catch (error) {
    console.error('Supabase heartbeat request failed:', error);
    return response.status(502).json({ error: 'Unable to reach heartbeat database' });
  }
}
