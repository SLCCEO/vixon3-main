import assert from 'node:assert/strict';
import test from 'node:test';
import handler from '../api-handlers/host-telemetry.js';

const createResponse = () => ({
  headers: {},
  statusCode: 200,
  setHeader(name, value) {
    this.headers[name] = value;
    return this;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const validPayload = {
  host_id: 'minecraft-01',
  host_name: 'Minecraft Server',
  platform: 'win32',
  cpu_percent: 12.5,
  memory_total_bytes: 16000000000,
  memory_available_bytes: 8000000000,
  uptime_seconds: 3600,
};

test('host telemetry rejects requests without the agent token', async (t) => {
  const previousToken = process.env.HOST_TELEMETRY_AGENT_TOKEN;
  const previousFetch = globalThis.fetch;
  t.after(() => {
    if (previousToken === undefined) delete process.env.HOST_TELEMETRY_AGENT_TOKEN;
    else process.env.HOST_TELEMETRY_AGENT_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  });
  process.env.HOST_TELEMETRY_AGENT_TOKEN = 'expected-token';
  let databaseCalled = false;
  globalThis.fetch = async () => {
    databaseCalled = true;
    return { ok: true, status: 204 };
  };

  const response = createResponse();
  await handler({ method: 'POST', headers: {}, body: validPayload }, response);

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, { error: 'Unauthorized' });
  assert.equal(databaseCalled, false);
});

test('host telemetry validates metric bounds before writing', async (t) => {
  const previousToken = process.env.HOST_TELEMETRY_AGENT_TOKEN;
  const previousFetch = globalThis.fetch;
  t.after(() => {
    if (previousToken === undefined) delete process.env.HOST_TELEMETRY_AGENT_TOKEN;
    else process.env.HOST_TELEMETRY_AGENT_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  });
  process.env.HOST_TELEMETRY_AGENT_TOKEN = 'expected-token';
  let databaseCalled = false;
  globalThis.fetch = async () => {
    databaseCalled = true;
    return { ok: true, status: 204 };
  };

  const response = createResponse();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer expected-token' },
    body: { ...validPayload, cpu_percent: 101 },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(databaseCalled, false);
});

test('authorized host telemetry upserts only the submitted host metrics', async (t) => {
  const previous = {
    token: process.env.HOST_TELEMETRY_AGENT_TOKEN,
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    fetch: globalThis.fetch,
  };
  t.after(() => {
    if (previous.token === undefined) delete process.env.HOST_TELEMETRY_AGENT_TOKEN;
    else process.env.HOST_TELEMETRY_AGENT_TOKEN = previous.token;
    if (previous.url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.key;
    globalThis.fetch = previous.fetch;
  });
  process.env.HOST_TELEMETRY_AGENT_TOKEN = 'expected-token';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  let databaseRequest;
  globalThis.fetch = async (url, options) => {
    databaseRequest = { url: String(url), options };
    return { ok: true, status: 204 };
  };

  const response = createResponse();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer expected-token' },
    body: validPayload,
  }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.match(databaseRequest.url, /\/rest\/v1\/host_telemetry\?on_conflict=host_id$/);
  assert.equal(databaseRequest.options.headers.apikey, 'service-role-key');
  const storedPayload = JSON.parse(databaseRequest.options.body);
  assert.equal(storedPayload.host_id, validPayload.host_id);
  assert.equal(storedPayload.cpu_percent, validPayload.cpu_percent);
  assert.equal(typeof storedPayload.last_seen_at, 'string');
});
