import discordStaff from './discord-staff.js';
import health from './health.js';
import hostTelemetry from './host-telemetry.js';
import patreon from './patreon.js';
import socialStats from './social-stats.js';
import twitch from './twitch.js';
import twitchCallback from './twitch-callback.js';
import twitchLogin from './twitch-login.js';
import twitchModerationCallback from './twitch/callback.js';
import twitchModerationLogin from './twitch/login.js';
import vexNodeCallback from './vex-node/callback.js';
import vexNodeDashboard from './vex-node/dashboard.js';
import vexNodeEditorAccess from './vex-node/editor-access.js';
import vexNodeEvidence from './vex-node/evidence.js';
import vexNodeLogin from './vex-node/login.js';
import vexNodeLogout from './vex-node/logout.js';
import vexNodeRealtimeToken from './vex-node/realtime-token.js';
import vexNodeRealtimeTool from './vex-node/realtime-tool.js';
import vexNodeTwitchSync from './vex-node/twitch-sync.js';

const apiHandlers = new Map([
  ['discord-staff', discordStaff],
  ['health', health],
  ['host-telemetry', hostTelemetry],
  ['patreon', patreon],
  ['social-stats', socialStats],
  ['twitch', twitch],
  ['twitch-callback', twitchCallback],
  ['twitch-login', twitchLogin],
  ['twitch/callback', twitchModerationCallback],
  ['twitch/login', twitchModerationLogin],
  ['vex-node/callback', vexNodeCallback],
  ['vex-node/dashboard', vexNodeDashboard],
  ['vex-node/editor-access', vexNodeEditorAccess],
  ['vex-node/evidence', vexNodeEvidence],
  ['vex-node/login', vexNodeLogin],
  ['vex-node/logout', vexNodeLogout],
  ['vex-node/realtime-token', vexNodeRealtimeToken],
  ['vex-node/realtime-tool', vexNodeRealtimeTool],
  ['vex-node/twitch-sync', vexNodeTwitchSync],
]);

export function normalizeApiRoute(route) {
  const segments = Array.isArray(route)
    ? route
    : typeof route === 'string'
      ? route.split('/')
      : [];
  return segments.map((segment) => String(segment).trim()).filter(Boolean).join('/');
}

export function getApiHandler(route) {
  return apiHandlers.get(normalizeApiRoute(route)) || null;
}

export function getApiRoutes() {
  return [...apiHandlers.keys()];
}
