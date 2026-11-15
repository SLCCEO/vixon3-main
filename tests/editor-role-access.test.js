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

const verifyRoles = async (roles) => {
  globalThis.fetch = async () => new Response(JSON.stringify({ roles }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  return verifyDiscordRole('discord-token', config);
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
