import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'vex-node-session';
export const STATE_COOKIE = 'vex-node-state';
const STATE_COOKIE_PATH = '/api/vex-node/callback';
const ROLE_CACHE_TTL_MS = 30_000;
const MAX_ROLE_CACHE_ENTRIES = 500;
const MAX_RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000;
const roleCache = new Map();
const roleChecksInFlight = new Map();
const rateLimitCooldowns = new Map();

export const getVexNodeConfig = () => {
  const {
    VEX_NODE_DISCORD_CLIENT_ID,
    VEX_NODE_DISCORD_CLIENT_SECRET,
    VEX_NODE_DISCORD_REDIRECT_URI,
    VEX_NODE_ALLOWED_ROLE_IDS,
    VEX_NODE_EDITOR_ROLE_IDS,
    VEX_NODE_SESSION_SECRET,
    DISCORD_GUILD_ID,
  } = process.env;

  const allowedRoleIds = (VEX_NODE_ALLOWED_ROLE_IDS || '')
    .split(',')
    .map((roleId) => roleId.trim())
    .filter(Boolean);
  const rawEditorRoleIds = (VEX_NODE_EDITOR_ROLE_IDS || '')
    .split(',')
    .map((roleId) => roleId.trim())
    .filter(Boolean);
  const editorRoleIds = rawEditorRoleIds.every((roleId) => /^\d+$/.test(roleId))
    ? rawEditorRoleIds
    : [];

  if (
    !VEX_NODE_DISCORD_CLIENT_ID ||
    !VEX_NODE_DISCORD_CLIENT_SECRET ||
    !VEX_NODE_DISCORD_REDIRECT_URI ||
    !DISCORD_GUILD_ID ||
    !allowedRoleIds.length ||
    allowedRoleIds.some((roleId) => !/^\d+$/.test(roleId)) ||
    !VEX_NODE_SESSION_SECRET ||
    Buffer.byteLength(VEX_NODE_SESSION_SECRET) < 32
  ) {
    return null;
  }

  let redirectUri;
  try {
    redirectUri = new URL(VEX_NODE_DISCORD_REDIRECT_URI);
  } catch {
    return null;
  }

  if (!['https:', 'http:'].includes(redirectUri.protocol)) return null;
  if (process.env.NODE_ENV === 'production' && redirectUri.protocol !== 'https:') return null;

  return {
    clientId: VEX_NODE_DISCORD_CLIENT_ID,
    clientSecret: VEX_NODE_DISCORD_CLIENT_SECRET,
    redirectUri: redirectUri.toString(),
    guildId: DISCORD_GUILD_ID,
    allowedRoleIds,
    editorRoleIds,
    sessionSecret: VEX_NODE_SESSION_SECRET,
  };
};

const cookieValue = (request, name) => {
  const cookieHeader = request.headers.cookie;
  if (typeof cookieHeader !== 'string') return null;

  for (const entry of cookieHeader.split(';')) {
    const separator = entry.indexOf('=');
    if (separator < 0 || entry.slice(0, separator).trim() !== name) continue;
    return entry.slice(separator + 1).trim();
  }

  return null;
};

const setCookie = (response, name, value, maxAge, path = '/') => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookie = `${name}=${value}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
  const existing = response.getHeader?.('Set-Cookie');
  const cookies = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
  response.setHeader('Set-Cookie', [...cookies, cookie]);
};

export const createOAuthState = () => randomBytes(32).toString('hex');

export const setOAuthStateCookie = (response, state) => {
  setCookie(response, STATE_COOKIE, state, 600, STATE_COOKIE_PATH);
};

export const clearOAuthStateCookie = (response) => {
  setCookie(response, STATE_COOKIE, '', 0, STATE_COOKIE_PATH);
};

export const hasValidOAuthState = (request, state) => {
  const storedState = cookieValue(request, STATE_COOKIE);
  if (!storedState || typeof state !== 'string') return false;
  const stored = Buffer.from(storedState);
  const provided = Buffer.from(state);
  return stored.length === provided.length && timingSafeEqual(stored, provided);
};

const sessionKey = (secret) => createHash('sha256').update(secret).digest();

export const setSessionCookie = (response, session, config) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sessionKey(config.sessionSecret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), 'utf8'),
    cipher.final(),
  ]);
  const token = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
  const maxAge = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
  setCookie(response, SESSION_COOKIE, token, maxAge);
};

export const clearSessionCookie = (response) => {
  setCookie(response, SESSION_COOKIE, '', 0);
};

export const readSession = (request, config) => {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;

  try {
    const encrypted = Buffer.from(token, 'base64url');
    if (encrypted.length <= 28) return null;

    const iv = encrypted.subarray(0, 12);
    const authTag = encrypted.subarray(12, 28);
    const ciphertext = encrypted.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', sessionKey(config.sessionSecret), iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const session = JSON.parse(plaintext.toString('utf8'));

    if (
      typeof session.userId !== 'string' ||
      typeof session.username !== 'string' ||
      typeof session.accessToken !== 'string' ||
      typeof session.expiresAt !== 'number' ||
      session.expiresAt <= Date.now()
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
};

const setBoundedEntry = (map, key, value) => {
  if (!map.has(key) && map.size >= MAX_ROLE_CACHE_ENTRIES) {
    map.delete(map.keys().next().value);
  }
  map.set(key, value);
};

const getRateLimitDelay = async (response) => {
  const retryAfterHeader = response.headers.get('retry-after');
  let delayMs = Number(retryAfterHeader) * 1000;
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    const retryDate = Date.parse(retryAfterHeader || '');
    delayMs = Number.isFinite(retryDate) ? retryDate - Date.now() : 0;
  }
  if (delayMs <= 0) {
    try {
      const body = await response.json();
      delayMs = Number(body?.retry_after) * 1000;
    } catch {
      delayMs = 0;
    }
  }
  return Math.min(
    MAX_RATE_LIMIT_COOLDOWN_MS,
    Math.max(1000, Number.isFinite(delayMs) ? delayMs : 0),
  );
};

const getRoleAccess = (roles, config) => ({
  authorized: roles.some((roleId) => config.allowedRoleIds.includes(roleId)),
  editorAuthorized: roles.some((roleId) => config.editorRoleIds?.includes(roleId)),
  expired: false,
});

export const verifyDiscordRole = async (accessToken, config) => {
  const tokenHash = createHash('sha256').update(accessToken).digest('hex');
  const cacheKey = `${config.guildId}:${tokenHash}`;
  const cached = roleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    roleCache.delete(cacheKey);
    roleCache.set(cacheKey, cached);
    return getRoleAccess(cached.roles, config);
  }
  if (cached) roleCache.delete(cacheKey);

  const retryAt = rateLimitCooldowns.get(cacheKey);
  if (retryAt && retryAt > Date.now()) {
    const retrySeconds = Math.ceil((retryAt - Date.now()) / 1000);
    throw new Error(`Discord membership check rate limited; retry in ${retrySeconds} seconds`);
  }
  if (retryAt) rateLimitCooldowns.delete(cacheKey);

  const pendingCheck = roleChecksInFlight.get(cacheKey);
  if (pendingCheck) {
    const roles = await pendingCheck;
    return roles ? getRoleAccess(roles, config) : { authorized: false, expired: true };
  }

  const memberUrl = `https://discord.com/api/v10/users/@me/guilds/${encodeURIComponent(config.guildId)}/member`;
  const check = (async () => {
    const memberResponse = await fetch(memberUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });

    if (memberResponse.status === 401) return null;
    if (memberResponse.status === 403 || memberResponse.status === 404) return [];
    if (memberResponse.status === 429) {
      const delayMs = await getRateLimitDelay(memberResponse);
      setBoundedEntry(rateLimitCooldowns, cacheKey, Date.now() + delayMs);
      throw new Error(`Discord membership check failed: 429 (retry in ${Math.ceil(delayMs / 1000)} seconds)`);
    }
    if (!memberResponse.ok) {
      throw new Error(`Discord membership check failed: ${memberResponse.status}`);
    }

    const member = await memberResponse.json();
    if (!Array.isArray(member.roles)) {
      throw new Error('Discord membership response did not include roles');
    }

    const roles = member.roles.filter((roleId) => typeof roleId === 'string');
    setBoundedEntry(roleCache, cacheKey, { roles, expiresAt: Date.now() + ROLE_CACHE_TTL_MS });
    return roles;
  })();
  roleChecksInFlight.set(cacheKey, check);

  try {
    const roles = await check;
    return roles ? getRoleAccess(roles, config) : { authorized: false, expired: true };
  } finally {
    if (roleChecksInFlight.get(cacheKey) === check) roleChecksInFlight.delete(cacheKey);
  }
};
