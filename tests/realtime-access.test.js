import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { getRealtimeUserAccess } from '../lib/realtime-access.js';

const allowlistVariables = ['VEX_NODE_PLANNER_USER_IDS', 'VEX_NODE_TECH_OPS_USER_IDS'];
const originalValues = new Map(allowlistVariables.map((name) => [name, process.env[name]]));

beforeEach(() => {
  for (const name of allowlistVariables) delete process.env[name];
});

after(() => {
  for (const [name, value] of originalValues) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test('assistant access is separated by Discord user ID', () => {
  process.env.VEX_NODE_PLANNER_USER_IDS = '11111111111111111,22222222222222222';
  process.env.VEX_NODE_TECH_OPS_USER_IDS = '11111111111111111';

  assert.deepEqual(getRealtimeUserAccess('11111111111111111'), {
    planner: { configured: true, allowed: true },
    tech_ops: { configured: true, allowed: true },
  });
  assert.deepEqual(getRealtimeUserAccess('22222222222222222'), {
    planner: { configured: true, allowed: true },
    tech_ops: { configured: true, allowed: false },
  });
});

test('missing assistant allowlists deny access', () => {
  assert.deepEqual(getRealtimeUserAccess('11111111111111111'), {
    planner: { configured: false, allowed: false },
    tech_ops: { configured: false, allowed: false },
  });
});

test('malformed Discord user IDs are rejected', () => {
  process.env.VEX_NODE_PLANNER_USER_IDS = 'not-a-discord-id';
  assert.throws(() => getRealtimeUserAccess('11111111111111111'), /VEX_NODE_PLANNER_USER_IDS/);
});
