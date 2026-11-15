import { getApiHandler, normalizeApiRoute } from '../api-handlers/router.js';

export default async function handler(request, response) {
  const route = normalizeApiRoute(request.query?.route);
  const apiHandler = getApiHandler(route);

  if (!apiHandler) {
    return response.status(404).json({ error: 'API route not found' });
  }

  return apiHandler(request, response);
}
