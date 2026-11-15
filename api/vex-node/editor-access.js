import { requireVexNodeEditorAccess } from '../../lib/vex-node-access.js';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const access = await requireVexNodeEditorAccess(request, response);
  if (!access) return;

  return response.status(200).json({
    authorized: true,
    user: {
      id: access.session.userId,
      username: access.session.username,
    },
  });
}
