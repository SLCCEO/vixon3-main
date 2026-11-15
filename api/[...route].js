import { getApiHandler, normalizeApiRoute } from '../api-handlers/router.js';

export default async function handler(request, response) {
  const routeParameter = request.query?.route;
  const requestPath = new URL(request.url || '/', 'http://vercel.local').pathname;
  const route = normalizeApiRoute(
    routeParameter ?? requestPath.replace(/^\/api\/?/, ''),
  );
  const apiHandler = getApiHandler(route);

  if (!apiHandler) {
    return response.status(404).json({ error: 'API route not found' });
  }

  return apiHandler(request, response);
}
