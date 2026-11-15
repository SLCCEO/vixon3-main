import { timingSafeEqual } from 'node:crypto';

const respondWithError = (response, status, error) => response.status(status).json({ error });

const parseBody = (body) => {
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  if (typeof body !== 'string' || body.length > 4096) return null;
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const hasValidToken = (request, expected) => {
  const authorization = request.headers.authorization;
  const match = typeof authorization === 'string' ? /^Bearer\s+(.+)$/i.exec(authorization) : null;
  if (!match) return false;
  const provided = Buffer.from(match[1]);
  const configured = Buffer.from(expected);
  return provided.length === configured.length && timingSafeEqual(provided, configured);
};

const isValidPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return false;
  if (typeof payload.host_id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(payload.host_id)) return false;
  if (typeof payload.host_name !== 'string' || !payload.host_name.trim() || payload.host_name.length > 128) return false;
  if (typeof payload.platform !== 'string' || !/^[a-zA-Z0-9_-]{1,16}$/.test(payload.platform)) return false;
  if (!Number.isFinite(payload.cpu_percent) || payload.cpu_percent < 0 || payload.cpu_percent > 100) return false;
  if (!Number.isSafeInteger(payload.memory_total_bytes) || payload.memory_total_bytes <= 0) return false;
  if (!Number.isSafeInteger(payload.memory_available_bytes) ||
      payload.memory_available_bytes < 0 ||
      payload.memory_available_bytes > payload.memory_total_bytes) return false;
  return Number.isSafeInteger(payload.uptime_seconds) && payload.uptime_seconds >= 0;
};

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return respondWithError(response, 405, 'Method not allowed');
  }

  const { HOST_TELEMETRY_AGENT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!HOST_TELEMETRY_AGENT_TOKEN) {
    return respondWithError(response, 503, 'Host telemetry is not configured');
  }
  if (!hasValidToken(request, HOST_TELEMETRY_AGENT_TOKEN)) {
    return respondWithError(response, 401, 'Unauthorized');
  }
  const payload = parseBody(request.body);
  if (!isValidPayload(payload)) {
    return respondWithError(response, 400, 'Invalid host telemetry payload');
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return respondWithError(response, 503, 'Host telemetry database is not configured');
  }

  try {
    const endpoint = new URL('/rest/v1/host_telemetry', SUPABASE_URL);
    endpoint.searchParams.set('on_conflict', 'host_id');
    const databaseResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        host_id: payload.host_id,
        host_name: payload.host_name.trim(),
        platform: payload.platform,
        cpu_percent: payload.cpu_percent,
        memory_total_bytes: payload.memory_total_bytes,
        memory_available_bytes: payload.memory_available_bytes,
        uptime_seconds: payload.uptime_seconds,
        last_seen_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!databaseResponse.ok) {
      console.error('Host telemetry write failed:', databaseResponse.status);
      return respondWithError(response, 502, 'Unable to store host telemetry');
    }
    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Host telemetry request failed:', error);
    return respondWithError(response, 502, 'Unable to reach host telemetry database');
  }
}
