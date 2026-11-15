import { requireVexNodeAccess } from '../../lib/vex-node-access.js';
import { getRealtimeUserAccess } from '../../lib/realtime-access.js';

const respondWithError = (response, status, error) => response.status(status).json({ error });

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return respondWithError(response, 405, 'Method not allowed');
  }

  const access = await requireVexNodeAccess(request, response);
  if (!access) return;

  try {
    const requestUrl = new URL(request.url, access.config.redirectUri);
    const searchQuery = (requestUrl.searchParams.get('q') || '').trim();
    const offsetValue = requestUrl.searchParams.get('offset') || '0';
    const offset = Number(offsetValue);
    if (searchQuery.length > 100) {
      return respondWithError(response, 400, 'Search query must be 100 characters or fewer');
    }
    if (!/^\d+$/.test(offsetValue) || !Number.isSafeInteger(offset) || offset > 100000) {
      return respondWithError(response, 400, 'Invalid moderation archive offset');
    }

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return respondWithError(response, 503, 'Supabase health is not configured');
    }

    const heartbeatUrl = new URL('/rest/v1/system_heartbeat', SUPABASE_URL);
    heartbeatUrl.search = new URLSearchParams({
      select: 'service,last_seen_at',
      service: 'eq.vexon-website',
      limit: '1',
    }).toString();

    const heartbeatResponse = await fetch(heartbeatUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!heartbeatResponse.ok) {
      console.error('VEX-NODE Supabase heartbeat read failed:', heartbeatResponse.status);
      return respondWithError(response, 502, 'Unable to read Supabase heartbeat');
    }

    const rows = await heartbeatResponse.json();
    const heartbeat = Array.isArray(rows) ? rows[0] : null;
    const lastSeenTime = heartbeat ? Date.parse(heartbeat.last_seen_at) : NaN;
    const heartbeatStatus = !heartbeat
      ? 'not_initialized'
      : !Number.isFinite(lastSeenTime)
        ? 'unknown'
        : Date.now() - lastSeenTime <= 6 * 24 * 60 * 60 * 1000
          ? 'healthy'
          : 'stale';

    const casesUrl = new URL('/rest/v1/rpc/search_moderation_cases', SUPABASE_URL);
    const casesResponse = await fetch(casesUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        search_query: searchQuery,
        result_limit: 101,
        result_offset: offset,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!casesResponse.ok) {
      console.error('VEX-NODE moderation archive read failed:', casesResponse.status);
      return respondWithError(response, 502, 'Unable to read the moderation archive');
    }

    const moderationCases = await casesResponse.json();
    if (!Array.isArray(moderationCases)) {
      return respondWithError(response, 502, 'Moderation archive response was invalid');
    }
    const hasMoreCases = moderationCases.length > 100;
    if (hasMoreCases) moderationCases.pop();
    const realtimeAccess = getRealtimeUserAccess(access.session.userId);

    return response.status(200).json({
      user: {
        id: access.session.userId,
        username: access.session.username,
        avatar: access.session.avatar,
      },
      heartbeat: {
        status: heartbeatStatus,
        lastSeenAt: heartbeat?.last_seen_at || null,
      },
      moderationCases,
      hasMoreCases,
      modules: {
        eventStream: 'not_configured',
        studioManagement: 'not_configured',
        moderationArchive: 'connected',
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        realtimeAssistants: {
          planner: realtimeAccess.planner.allowed,
          tech_ops: realtimeAccess.tech_ops.allowed,
        },
        videoEditorAccess: access.membership.editorAuthorized,
      },
    });
  } catch (error) {
    console.error('VEX-NODE dashboard request failed:', error);
    return respondWithError(response, 502, 'Unable to load VEX-NODE telemetry');
  }
}
