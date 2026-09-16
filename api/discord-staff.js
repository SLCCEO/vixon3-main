export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.DISCORD_SERVICE_URL || !process.env.DISCORD_SERVICE_API_KEY) {
    return response.status(503).json({ error: 'Discord service is not configured' });
  }

  try {
    const serviceResponse = await fetch(`${process.env.DISCORD_SERVICE_URL.replace(/\/$/, '')}/api/staff`, {
      headers: { 'x-api-key': process.env.DISCORD_SERVICE_API_KEY },
    });
    const data = await serviceResponse.json();
    return response.status(serviceResponse.status).json(data);
  } catch (error) {
    console.error('Discord staff service error:', error);
    return response.status(502).json({ error: 'Unable to reach Discord service' });
  }
}
