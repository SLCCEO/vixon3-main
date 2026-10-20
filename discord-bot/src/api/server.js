import cors from 'cors';
import express from 'express';

export function startWebsiteApi(client, staffIds) {
  const app = express();
  const port = Number(process.env.PORT || 8788);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError('PORT must be an integer between 1 and 65535.');
  }

  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS.'));
    }
  }));

  const authorize = (request, response, next) => {
    if (request.get('x-api-key') !== process.env.BOT_API_KEY) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };

  const getGuild = () => client.guilds.cache.get(process.env.DISCORD_GUILD_ID);

  app.get('/health', (_request, response) => {
    response.json({ online: client.isReady(), bot: client.user?.tag ?? null });
  });

  app.get('/api/staff', authorize, async (_request, response, next) => {
    const guild = getGuild();
    if (!guild) {
      response.status(503).json({ error: 'Discord guild is not available' });
      return;
    }

    try {
      const staff = await Promise.all(Object.entries(staffIds).map(async ([name, userId]) => {
        try {
          const member = await guild.members.fetch(userId);
          return {
            name,
            userId,
            username: member.user.username,
            displayName: member.displayName,
            avatarUrl: member.displayAvatarURL({ size: 256, extension: 'png' }),
            roles: member.roles.cache.filter((role) => role.id !== guild.id).map((role) => role.name),
            status: member.presence?.status || 'offline'
          };
        } catch (error) {
          console.error(`Unable to fetch website staff member ${userId}:`, error);
          return { name, userId, unavailable: true };
        }
      }));

      response.json({ staff });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/stats', authorize, (_request, response) => {
    const guild = getGuild();
    if (!guild) {
      response.status(503).json({ error: 'Discord guild is not available' });
      return;
    }

    const onlineMembers = guild.presences.cache
      .filter((presence) => presence.status !== 'offline')
      .size;
    response.json({ members: guild.memberCount, onlineMembers });
  });

  app.use((error, _request, response, _next) => {
    console.error('Website API request failed:', error);
    if (!response.headersSent) {
      response.status(500).json({ error: 'Internal server error' });
    }
  });

  return app.listen(port, () => {
    console.info(`Website API listening on port ${port}`);
  });
}
