import { requireVexNodeAccess } from '../../lib/vex-node-access.js';
import { getRealtimeUserAccess } from '../../lib/realtime-access.js';

const respondWithError = (response, status, error) => response.status(status).json({ error });

class ToolInputError extends Error {}

const parseBody = (body) => {
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  if (typeof body !== 'string') return null;
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const getSupabaseConfig = () => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return { url: SUPABASE_URL, key: SUPABASE_SERVICE_ROLE_KEY };
};

const supabaseRequest = async (url, key, options = {}) => fetch(url, {
  ...options,
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(options.headers || {}),
  },
  signal: AbortSignal.timeout(5000),
});

const getSystemHealth = async (supabase) => {
  const url = new URL('/rest/v1/system_heartbeat', supabase.url);
  url.search = new URLSearchParams({
    select: 'service,last_seen_at',
    service: 'eq.vexon-website',
    limit: '1',
  }).toString();
  const result = await supabaseRequest(url, supabase.key);
  if (!result.ok) throw new Error(`Supabase heartbeat lookup failed: ${result.status}`);
  const rows = await result.json();
  if (!Array.isArray(rows)) throw new TypeError('Supabase heartbeat response was invalid.');

  const lastSeenAt = rows[0]?.last_seen_at || null;
  const lastSeenTime = lastSeenAt ? Date.parse(lastSeenAt) : NaN;
  const status = !lastSeenAt
    ? 'not_initialized'
    : !Number.isFinite(lastSeenTime)
      ? 'unknown'
      : Date.now() - lastSeenTime <= 6 * 24 * 60 * 60 * 1000
        ? 'healthy'
        : 'stale';
  return { status, lastSeenAt, hostMetrics: 'not_exposed_by_serverless_runtime' };
};

const listStudioTasks = async (supabase) => {
  const url = new URL('/rest/v1/studio_tasks', supabase.url);
  url.search = new URLSearchParams({
    select: 'id,title,description,status,due_at,created_at',
    status: 'in.(open,in_progress)',
    order: 'due_at.asc.nullslast,created_at.desc',
    limit: '20',
  }).toString();
  const result = await supabaseRequest(url, supabase.key);
  if (!result.ok) throw new Error(`Studio task lookup failed: ${result.status}`);
  const tasks = await result.json();
  if (!Array.isArray(tasks)) throw new TypeError('Studio task response was invalid.');
  return { tasks };
};

const createStudioTask = async (supabase, args, session) => {
  const title = typeof args.title === 'string' ? args.title.trim() : '';
  const description = typeof args.description === 'string' ? args.description.trim() : '';
  const dueAt = args.due_at == null ? undefined : args.due_at;
  if (!title || title.length > 160) throw new ToolInputError('Task title must be between 1 and 160 characters.');
  if (description.length > 1000) throw new ToolInputError('Task description must be 1000 characters or fewer.');
  if (dueAt !== undefined && (
    typeof dueAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T/.test(dueAt) ||
    !Number.isFinite(Date.parse(dueAt))
  )) {
    throw new ToolInputError('Task due_at must be a valid ISO 8601 date and time.');
  }

  const url = new URL('/rest/v1/studio_tasks', supabase.url);
  const result = await supabaseRequest(url, supabase.key, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      title,
      description: description || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      created_by: session.userId,
      created_by_name: session.username,
    }),
  });
  if (!result.ok) throw new Error(`Studio task creation failed: ${result.status}`);
  const rows = await result.json();
  if (!Array.isArray(rows) || !rows[0]) throw new TypeError('Supabase did not return the created task.');
  return { task: rows[0] };
};

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return respondWithError(response, 405, 'Method not allowed');
  }

  const access = await requireVexNodeAccess(request, response);
  if (!access) return;
  if (request.headers.origin !== new URL(access.config.redirectUri).origin) {
    return respondWithError(response, 403, 'Invalid request origin');
  }

  const body = parseBody(request.body);
  const { persona, name, args } = body || {};
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return respondWithError(response, 400, 'Tool arguments must be an object');
  }
  if (!['planner', 'tech_ops'].includes(persona)) {
    return respondWithError(response, 403, 'Tool persona is not available');
  }
  let personaAccess;
  try {
    personaAccess = getRealtimeUserAccess(access.session.userId)[persona];
  } catch (error) {
    console.error('VEX-NODE realtime account allowlist is invalid:', error);
    return respondWithError(response, 503, 'VEX-NODE voice access is misconfigured');
  }
  if (!personaAccess.configured) {
    return respondWithError(response, 503, `VEX_NODE_${persona.toUpperCase()}_USER_IDS is not configured`);
  }
  if (!personaAccess.allowed) return respondWithError(response, 403, 'This assistant is not assigned to your Discord account');

  const supabase = getSupabaseConfig();
  if (!supabase) return respondWithError(response, 503, 'Supabase is not configured');

  try {
    let result;
    if (persona === 'tech_ops' && name === 'get_system_health') {
      result = await getSystemHealth(supabase);
    } else if (persona === 'planner' && name === 'list_studio_tasks') {
      result = await listStudioTasks(supabase);
    } else if (persona === 'planner' && name === 'create_studio_task') {
      result = await createStudioTask(supabase, args, access.session);
    } else {
      return respondWithError(response, 403, 'Tool is not available for this persona');
    }

    return response.status(200).json({ result });
  } catch (error) {
    console.error(`VEX-NODE ${persona} tool ${name} failed:`, error);
    const status = error instanceof ToolInputError ? 400 : 502;
    return respondWithError(response, status, status === 400 ? error.message : 'The requested tool could not complete');
  }
}
