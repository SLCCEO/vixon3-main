# VEXON Discord Bot

Discord.js v14 bot and website API service. It keeps the bot token and Supabase secret key off Vercel, serves the existing website's staff/member API, and provides modular slash commands.

## Setup

1. Create a Discord application and bot in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Invite the bot to the VEXON server with `bot` and `applications.commands` scopes and required permissions.
3. Enable the Server Members and Server Members Presence intents in the bot settings.
4. Copy `.env.example` to `.env` and fill in the values. Keep `DISCORD_BOT_TOKEN`, `BOT_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` private.
5. Run the SQL in [`database/schema.sql`](./database/schema.sql) in the Supabase SQL Editor.
6. Install dependencies and deploy commands:

```powershell
npm install
npm run deploy
npm start
```

## API

- `GET /health`
- `GET /api/staff` with `x-api-key: BOT_API_KEY`
- `GET /api/stats` with `x-api-key: BOT_API_KEY`

In Vercel, set `DISCORD_SERVICE_URL` to this service's base URL and `DISCORD_SERVICE_API_KEY` to the same secret value as `BOT_API_KEY`. The existing `/api/discord-staff` and `/api/social-stats` routes will continue to work. Deploy this bot as a long-running Node service on Railway, Render, Fly.io, or a VPS; Vercel serverless functions cannot host the persistent Discord gateway connection. When deploying to a guild, the deploy script clears this application's global slash commands to prevent duplicate entries.

Set `STAFF_ROLE_ID` to the role authorized for staff/duty commands. Server members with Manage Server permission also have access. Moderation commands enforce their corresponding Discord permissions.

## Join monitoring

The bot flags accounts younger than `MIN_ACCOUNT_AGE_DAYS` (default 7 days) and alerts once when `JOIN_SPIKE_THRESHOLD` (default 5) members join within `JOIN_SPIKE_WINDOW_SECONDS` (default 60). Set `MODERATION_ALERT_CHANNEL_ID` to a staff-only text channel ID to receive Discord alerts; if it is unset, alerts are written to the bot console. These are review signals only: the bot does not automatically kick or ban members, and it does not collect IP addresses.

Submitting `/duty loa` sends the request reason to the `VexonCore` and `Testing10325` users configured in `DISCORD_STAFF_IDS`. Those approvers can review it in the server with `/loa-approve user:<member>` or `/loa-reject user:<member>`; being a configured approver grants access to those two review commands. Make sure both users have valid Discord user IDs in that JSON object and allow DMs from the bot.

Warning records exist in the bot's Supabase database; Discord has no native warning record to delete. `/warn-clear one` removes a warning by ID, while `/warn-clear all` clears a selected member's bot warning records. Successful removals are posted to `MODERATION_ALERT_CHANNEL_ID` when configured. The bot and its role need permission to view and send messages in that staff-only channel.

## Commands

- Moderation: `/clear`, `/warn`, `/warnings`, `/warn-clear one|all`, `/kick`, `/ban`, `/timeout`, `/untimeout`
- Staff/Duty: `/duty`, `/loa-approve`, `/loa-reject`, `/staff-list`, `/staff-info`
- Community/Fun: `/8ball`, `/coinflip`, `/choose`, `/roll`, `/joke`, `/poll`
- Server Info: `/ping`, `/serverinfo`, `/userinfo`, `/avatar`, `/roleinfo`, `/botinfo`

Twitch OAuth and Twitch API requests remain handled by the website's Vercel `/api/twitch` routes. Their Twitch credentials should remain configured in Vercel; the Discord bot does not need them.
