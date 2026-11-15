import { GoogleGenAI } from '@google/genai';
import { getRealtimeAssistantConfig, REALTIME_MODEL } from '../../lib/realtime-assistants.js';
import { getRealtimeUserAccess } from '../../lib/realtime-access.js';
import { requireVexNodeAccess } from '../../lib/vex-node-access.js';

const respondWithError = (response, status, error) => response.status(status).json({ error });

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
  const persona = body?.persona;
  const config = getRealtimeAssistantConfig(persona);
  if (!config) return respondWithError(response, 400, 'Persona must be planner or tech_ops');
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
  if (!process.env.GEMINI_API_KEY) {
    return respondWithError(response, 503, 'Gemini Live is not configured');
  }

  try {
    const client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { apiVersion: 'v1beta' },
    });
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        newSessionExpireTime: new Date(Date.now() + 60_000).toISOString(),
        expireTime: new Date(Date.now() + 5 * 60_000).toISOString(),
        liveConnectConstraints: {
          model: `models/${REALTIME_MODEL}`,
          config,
        },
        lockAdditionalFields: [
          'responseModalities',
          'inputAudioTranscription',
          'outputAudioTranscription',
          'systemInstruction',
          'tools',
        ],
      },
    });

    if (typeof token.name !== 'string' || !token.name) {
      throw new Error('Gemini did not return an ephemeral session token.');
    }

    return response.status(200).json({ token: token.name, model: REALTIME_MODEL, config });
  } catch (error) {
    console.error('VEX-NODE Gemini token provisioning failed:', error);
    return respondWithError(response, 502, 'Unable to start a Gemini Live session');
  }
}
