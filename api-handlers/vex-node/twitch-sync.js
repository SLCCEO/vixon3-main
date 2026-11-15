import { requireVexNodeAccess } from '../../lib/vex-node-access.js';

const requestTwitch = async (url, token) => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID,
    },
    signal: AbortSignal.timeout(8000),
  });
  return response;
};

const requestSupabase = async (url, method, key, body) => fetch(url, {
  method,
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
  signal: AbortSignal.timeout(8000),
});

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const access = await requireVexNodeAccess(request, response);
  if (!access) return;
  if (request.headers.origin !== new URL(access.config.redirectUri).origin) {
    return response.status(403).json({ error: 'Invalid request origin' });
  }

  const accessToken = process.env.TWITCH_ACCESS_TOKEN;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const broadcasterLogin = (process.env.VEX_NODE_TWITCH_BROADCASTER_LOGIN || 'vexoncore').trim().toLowerCase();
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!accessToken || !clientId) {
    return response.status(503).json({ error: 'Twitch user OAuth is not configured' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return response.status(503).json({ error: 'Supabase is not configured' });
  }

  try {
    const identityResponse = await requestTwitch('https://api.twitch.tv/helix/users', accessToken);
    if (!identityResponse.ok) {
      console.error('Twitch identity lookup failed:', identityResponse.status);
      return response.status(502).json({ error: 'Unable to verify the Twitch authorization' });
    }

    const identity = await identityResponse.json();
    const moderatorId = identity.data?.[0]?.id;
    if (!moderatorId) return response.status(502).json({ error: 'Twitch authorization did not return an account' });

    const broadcasterUrl = new URL('https://api.twitch.tv/helix/users');
    broadcasterUrl.searchParams.set('login', broadcasterLogin);
    const broadcasterResponse = await requestTwitch(broadcasterUrl, accessToken);
    if (!broadcasterResponse.ok) {
      console.error('Twitch broadcaster lookup failed:', broadcasterResponse.status);
      return response.status(502).json({ error: 'Unable to find the configured Twitch channel' });
    }

    const broadcaster = (await broadcasterResponse.json()).data?.[0];
    if (!broadcaster) return response.status(404).json({ error: 'Configured Twitch channel was not found' });

    const bans = [];
    let cursor;
    for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
      const bansUrl = new URL('https://api.twitch.tv/helix/moderation/banned');
      bansUrl.searchParams.set('broadcaster_id', broadcaster.id);
      bansUrl.searchParams.set('moderator_id', moderatorId);
      bansUrl.searchParams.set('first', '100');
      if (cursor) bansUrl.searchParams.set('after', cursor);

      const bansResponse = await requestTwitch(bansUrl, accessToken);
      if (bansResponse.status === 401 || bansResponse.status === 403) {
        return response.status(403).json({
          error: 'Reauthorize Twitch with the moderation:read:banned_users scope before syncing its ban list',
        });
      }
      if (!bansResponse.ok) {
        console.error('Twitch ban-list lookup failed:', bansResponse.status);
        return response.status(502).json({ error: 'Unable to read the Twitch ban list' });
      }

      const page = await bansResponse.json();
      if (!Array.isArray(page.data)) throw new TypeError('Twitch ban-list response was invalid');
      bans.push(...page.data);
      cursor = page.pagination?.cursor;
      if (!cursor) break;
      if (pageNumber === 99) throw new RangeError('Twitch ban list exceeds the 10,000-record scan limit');
    }

    const supabaseBase = new URL('/rest/v1/moderation_cases', SUPABASE_URL);
    const rows = bans.map((ban) => ({
      source_system: 'twitch_ban',
      source_id: `${broadcaster.id}:${ban.user_id}`,
      platforms: ['twitch'],
      actions: [ban.expires_at ? 'timeout' : 'ban'],
      target_user_id: ban.user_id,
      target_username: ban.user_name || ban.user_login,
      moderator_user_id: ban.moderator_id || moderatorId,
      reason: ban.reason || null,
      status: 'active',
      source_url: `https://www.twitch.tv/${broadcaster.login}`,
      raw_content: [{
        userLogin: ban.user_login,
        createdAt: ban.created_at,
        expiresAt: ban.expires_at || null,
      }],
      evidence: [],
      occurred_at: ban.created_at || null,
      synced_at: new Date().toISOString(),
    }));

    for (let offset = 0; offset < rows.length; offset += 100) {
      const writeResponse = await requestSupabase(
        supabaseBase,
        'POST',
        SUPABASE_SERVICE_ROLE_KEY,
        rows.slice(offset, offset + 100),
      );
      if (!writeResponse.ok) {
        console.error('Supabase Twitch ban write failed:', writeResponse.status);
        return response.status(502).json({ error: 'Unable to save Twitch ban records' });
      }
    }

    const currentIds = new Set(rows.map((row) => row.source_id));
    const existingIds = [];
    for (let offset = 0; offset < 50000; offset += 1000) {
      const existingUrl = new URL(supabaseBase);
      existingUrl.search = new URLSearchParams({
        select: 'source_id',
        source_system: 'eq.twitch_ban',
        status: 'eq.active',
        limit: '1000',
        offset: String(offset),
      }).toString();
      const existingResponse = await fetch(existingUrl, {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Range: `${offset}-${offset + 999}`,
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!existingResponse.ok) {
        console.error('Supabase Twitch archive lookup failed:', existingResponse.status);
        return response.status(502).json({ error: 'Unable to compare the archived Twitch ban list' });
      }
      const page = await existingResponse.json();
      if (!Array.isArray(page)) throw new TypeError('Supabase Twitch archive response was invalid');
      existingIds.push(...page.map((row) => row.source_id));
      if (page.length < 1000) break;
      if (offset === 49000) throw new RangeError('Archived Twitch ban list exceeds the 50,000-record safety limit');
    }

    const removedIds = existingIds.filter((sourceId) => !currentIds.has(sourceId));
    for (let offset = 0; offset < removedIds.length; offset += 100) {
      const updateUrl = new URL(supabaseBase);
      updateUrl.search = new URLSearchParams({
        source_system: 'eq.twitch_ban',
        status: 'eq.active',
        source_id: `in.(${removedIds.slice(offset, offset + 100).join(',')})`,
      }).toString();
      const updateResponse = await requestSupabase(
        updateUrl,
        'PATCH',
        SUPABASE_SERVICE_ROLE_KEY,
        { status: 'inactive', synced_at: new Date().toISOString() },
      );
      if (!updateResponse.ok) {
        console.error('Supabase Twitch archive update failed:', updateResponse.status);
        return response.status(502).json({ error: 'Unable to update archived Twitch ban status' });
      }
    }

    return response.status(200).json({
      platform: 'twitch',
      channel: broadcaster.login,
      activeBans: bans.filter((ban) => !ban.expires_at).length,
      activeTimeouts: bans.filter((ban) => Boolean(ban.expires_at)).length,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('VEX-NODE Twitch moderation sync failed:', error);
    return response.status(502).json({ error: 'Twitch moderation sync failed' });
  }
}
