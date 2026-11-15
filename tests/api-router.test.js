import assert from 'node:assert/strict';
import test from 'node:test';
import { getApiHandler, getApiRoutes, normalizeApiRoute } from '../api-handlers/router.js';
import apiRouter from '../api/router.js';

const expectedRoutes = [
  'discord-staff',
  'health',
  'host-telemetry',
  'patreon',
  'social-stats',
  'twitch',
  'twitch-callback',
  'twitch-login',
  'twitch/callback',
  'twitch/login',
  'vex-node/callback',
  'vex-node/dashboard',
  'vex-node/editor-access',
  'vex-node/evidence',
  'vex-node/login',
  'vex-node/logout',
  'vex-node/realtime-token',
  'vex-node/realtime-tool',
  'vex-node/twitch-sync',
];

test('all existing API endpoints resolve through the shared router', () => {
  assert.deepEqual(getApiRoutes().sort(), expectedRoutes);
  for (const route of expectedRoutes) {
    assert.equal(typeof getApiHandler(route), 'function', `${route} should have a handler`);
  }
});

test('catch-all route segments normalize to the existing endpoint path', () => {
  assert.equal(normalizeApiRoute(['vex-node', 'realtime-token']), 'vex-node/realtime-token');
  assert.equal(normalizeApiRoute('twitch/callback'), 'twitch/callback');
  assert.equal(getApiHandler(['twitch', 'login']), getApiHandler('twitch/login'));
});

test('unknown API endpoints do not resolve to a handler', () => {
  assert.equal(getApiHandler(['not-a-route']), null);
});

test('catch-all dispatches a request to its endpoint handler', async () => {
  const response = {
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
    send(body) {
      this.body = body;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await apiRouter({
    method: 'GET',
    query: { route: ['vex-node', 'logout'] },
    url: '/api/vex-node/logout',
  }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'POST');
  assert.deepEqual(response.body, { error: 'Method not allowed' });
});
