import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { verifyDiscordRole } from '../lib/vex-node-auth.js';

const originalFetch = globalThis.fetch;
const config = {
  guildId: 'guild-id',
  allowedRoleIds: ['staff-role'],
  editorRoleIds: ['editor-role'],
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const verifyRoles = async (roles, accessToken = `discord-token-${roles.join('-')}`) => {
  globalThis.fetch = async () => new Response(JSON.stringify({ roles }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  return verifyDiscordRole(accessToken, config);
};

test('editor role grants editor access without staff dashboard access', async () => {
  assert.deepEqual(await verifyRoles(['editor-role']), {
    authorized: false,
    editorAuthorized: true,
    expired: false,
  });
});

test('staff role access does not implicitly grant editor access', async () => {
  assert.deepEqual(await verifyRoles(['staff-role']), {
    authorized: true,
    editorAuthorized: false,
    expired: false,
  });
});

test('unlisted roles grant neither staff nor editor access', async () => {
  assert.deepEqual(await verifyRoles(['unlisted-role']), {
    authorized: false,
    editorAuthorized: false,
    expired: false,
  });
});

test('successful Discord role checks are briefly cached per OAuth session', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ roles: ['staff-role'] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const first = await verifyDiscordRole('cached-discord-token', config);
  const second = await verifyDiscordRole('cached-discord-token', config);

  assert.deepEqual(second, first);
  assert.equal(calls, 1);
});

test('Discord rate limits are respected for repeated role checks', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ retry_after: 30 }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  await assert.rejects(
    verifyDiscordRole('rate-limited-discord-token', config),
    /Discord membership check failed: 429/,
  );
  await assert.rejects(
    verifyDiscordRole('rate-limited-discord-token', config),
    /rate limited; retry in/,
  );
  assert.equal(calls, 1);
});
