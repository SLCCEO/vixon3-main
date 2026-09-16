const patreonApiUrl = 'https://www.patreon.com/api/oauth2/v2';

const patreonRequest = async (path, token) => {
  const response = await fetch(`${patreonApiUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Patreon request failed: ${response.status}`);
  return response.json();
};

const getCampaignId = async (token) => {
  const params = new URLSearchParams({
    'fields[campaign]': 'name',
    'page[count]': '1',
  });
  const data = await patreonRequest(`/campaigns?${params}`, token);
  return data.data?.[0]?.id;
};

const getActiveMembers = async (campaignId, token) => {
  const members = [];
  const userNames = new Map();
  let nextUrl = `/campaigns/${campaignId}/members?include=user&fields[member]=patron_status&fields[user]=full_name&page[count]=100&filter[patron_status]=active`;

  while (nextUrl) {
    const data = await patreonRequest(nextUrl, token);
    for (const included of data.included || []) {
      if (included.type === 'user' && included.attributes?.full_name) {
        userNames.set(included.id, included.attributes.full_name);
      }
    }

    for (const member of data.data || []) {
      const userId = member.relationships?.user?.data?.id;
      const name = userNames.get(userId) || member.attributes?.full_name;
      if (name) {
        members.push({
          name,
          tier: member.attributes?.patron_status || 'Active supporter',
        });
      }
    }

    nextUrl = data.links?.next ? new URL(data.links.next).pathname + new URL(data.links.next).search : null;
  }

  return members;
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.PATREON_ACCESS_TOKEN;
  if (!token) {
    return response.status(503).json({ error: 'Patreon API is not configured' });
  }

  try {
    const campaignId = await getCampaignId(token);
    if (!campaignId) throw new Error('No Patreon campaign found');
    const members = await getActiveMembers(campaignId, token);
    return response.status(200).json({ members });
  } catch (error) {
    console.error('Patreon API error:', error);
    return response.status(502).json({ error: 'Unable to load Patreon members' });
  }
}
