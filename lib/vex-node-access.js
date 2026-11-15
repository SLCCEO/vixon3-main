import {
  clearSessionCookie,
  getVexNodeConfig,
  readSession,
  verifyDiscordRole,
} from './vex-node-auth.js';

const respondWithError = (response, status, error) => response.status(status).json({ error });

export const requireVexNodeAccess = async (request, response) => {
  const config = getVexNodeConfig();
  if (!config) {
    respondWithError(response, 503, 'VEX-NODE authentication is not configured');
    return null;
  }

  const session = readSession(request, config);
  if (!session) {
    clearSessionCookie(response);
    respondWithError(response, 401, 'Authentication required');
    return null;
  }

  try {
    const membership = await verifyDiscordRole(session.accessToken, config);
    if (!membership.authorized) {
      if (membership.expired) clearSessionCookie(response);
      respondWithError(response, membership.expired ? 401 : 403, 'VEX-NODE staff access is required');
      return null;
    }
    return { config, session, membership };
  } catch (error) {
    console.error('VEX-NODE Discord role verification failed:', error);
    respondWithError(response, 502, 'Unable to verify VEX-NODE staff access');
    return null;
  }
};

export const requireVexNodeEditorAccess = async (request, response) => {
  const config = getVexNodeConfig();
  if (!config) {
    respondWithError(response, 503, 'VEX-NODE authentication is not configured');
    return null;
  }
  if (!config.editorRoleIds.length) {
    respondWithError(response, 503, 'VEX-NODE editor role access is not configured');
    return null;
  }

  const session = readSession(request, config);
  if (!session) {
    clearSessionCookie(response);
    respondWithError(response, 401, 'Authentication required');
    return null;
  }

  try {
    const membership = await verifyDiscordRole(session.accessToken, config);
    if (membership.expired) {
      clearSessionCookie(response);
      respondWithError(response, 401, 'Authentication required');
      return null;
    }
    if (!membership.editorAuthorized) {
      respondWithError(response, 403, 'VEX-NODE editor access is required');
      return null;
    }

    return { config, session, membership };
  } catch (error) {
    console.error('VEX-NODE editor role verification failed:', error);
    respondWithError(response, 502, 'Unable to verify VEX-NODE editor access');
    return null;
  }
};
