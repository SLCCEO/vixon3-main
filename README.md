Vixon / Vexon SYS

Created by: Jeremiah_YT

Copyright: © 2026 Jeremiah_YT. All rights reserved.

This project is a React + TypeScript + Vite template providing a minimal setup for building web applications. It includes HMR (Hot Module Replacement) and ESLint rules for clean, maintainable code.



Official Links

Live Example: https://www.vixon.online

Developer Portfolio: https://jeremiah-portfolio-mu.vercel.app

Patreon supporter feed

The `/patreon` page requests the server-side `/api/patreon` endpoint, which discovers the creator campaign, fetches active memberships, follows pagination, and lists patrons with a returned name. Configure this Vercel environment variable:

```text
PATREON_ACCESS_TOKEN=your-patreon-creator-access-token
```

The token must have permission to read the creator's campaigns and members. Keep the Patreon access token on the server; do not expose it in a `VITE_` variable or browser code. `VITE_PATREON_MEMBERS_URL` is still supported as an optional override for an existing server-side feed that returns either an array or `{ "members": [] }` with this shape:

```json
[{ "name": "Display name", "tier": "Supporter" }]
```

Without the token configured, the page shows that Patreon API setup is required and does not display placeholder names.

Source-code tier

The source-code access tier is **The System Architect**. Join the tier through the [VexonStudio Patreon membership page](https://www.patreon.com/cw/VexonStudios/membership). After the qualifying payment is verified, Jeremiah_YT or VexonStudio staff will provide the authorized source-code access and related installation information. Source-code access is not a public or unrestricted download and remains subject to the terms below. make an ticket in our Discord server.

Twitch streamer data

The `/streamers` page requests `/api/twitch`. Configure these server-side Vercel environment variables before deployment:

```text
TWITCH_CLIENT_ID=your-twitch-client-id
TWITCH_CLIENT_SECRET=your-twitch-client-secret
TWITCH_ACCESS_TOKEN=your-broadcaster-user-access-token
TWITCH_REFRESH_TOKEN=your-broadcaster-refresh-token

To authorize the Twitch follower token, register `https://www.vixon.online/api/twitch-callback` as the OAuth redirect URL, then open `https://www.vixon.online/api/twitch-login`.
```

The Twitch client secret, access token, and refresh token must never use a `VITE_` prefix because they must not be sent to the browser. Authorize the Vexon Twitch account through `/api/twitch-login` and save the returned tokens server-side. The login requests `moderator:read:followers` and `moderation:read:banned_users`; reauthorize after deploying this scope change before using the VEX-NODE Twitch ban sync. The website uses the follower scope for stream statistics and the banned-users scope to read the broadcaster's current ban/timeout list.

Homepage social statistics

The homepage dashboard requests `/api/social-stats` for YouTube subscribers, TikTok followers, and Discord members. Configure these server-side Vercel environment variables:

```text
YOUTUBE_API_KEY=your-youtube-data-api-key
YOUTUBE_CHANNEL_ID=your-youtube-channel-id
TIKTOK_ACCESS_TOKEN=your-tiktok-user-access-token
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_GUILD_ID=your-discord-server-id
DISCORD_SERVICE_URL=https://your-discord-bot-service.example.com
DISCORD_SERVICE_API_KEY=the-same-value-as-the-bot-BOT_API_KEY
```

Enable the YouTube Data API v3 for the Google key. Authorize the TikTok account through Login Kit with both `user.info.basic` and `user.info.stats`; the latter provides follower, following, likes, and video counts. The token must belong to the account whose follower count should be displayed. The separate Discord bot project lives in `discord-bot/`; deploy it as a long-running Node service, then set `DISCORD_SERVICE_URL` and `DISCORD_SERVICE_API_KEY` in Vercel. Missing or unauthorized services return `null` for that card while the other counts continue loading.

Vercel Hobby function routing

The website's API endpoints are dispatched through one shared Vercel function and an `/api/:route*` rewrite to stay within the Hobby plan function limit. Their implementations live in `api-handlers/`; when adding an endpoint, add its handler to `api-handlers/router.js` rather than creating another JavaScript file under `api/`.

Supabase keep-alive

The protected `/api/health` endpoint upserts the website's last activity timestamp into `public.system_heartbeat`. Apply `supabase/migrations/20261115000000_system_heartbeat.sql` to the Supabase project before enabling the scheduled workflow. Configure these Vercel environment variables:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-side-service-role-key
CRON_SECRET=a-long-random-secret
```

Keep both keys server-side; never expose them through `VITE_` variables. Add `SITE_URL` (the deployed origin, without a trailing slash) and the same `CRON_SECRET` as GitHub Actions repository secrets. `.github/workflows/supabase-heartbeat.yml` runs every three days and can also be started manually from the Actions tab. The endpoint only accepts authenticated GET requests and updates one row; unauthenticated requests are rejected. The Supabase REST API is used for this small upsert, so it does not open direct PostgreSQL connections or require separate PgBouncer configuration.

VEX-NODE staff dashboard

The private `/node` dashboard signs staff in through Discord OAuth. In the Discord Developer Portal, register the callback URL shown by `VEX_NODE_DISCORD_REDIRECT_URI` and enable the `identify` and `guilds.members.read` scopes. Configure these server-side Vercel variables:

```text
VEX_NODE_DISCORD_CLIENT_ID=your-discord-application-id
VEX_NODE_DISCORD_CLIENT_SECRET=your-discord-application-secret
VEX_NODE_DISCORD_REDIRECT_URI=https://www.vixon.online/api/vex-node/callback
VEX_NODE_ALLOWED_ROLE_IDS=staff-role-id,moderator-role-id,admin-role-id
VEX_NODE_EDITOR_ROLE_IDS=video-editor-role-id
VEX_NODE_PLANNER_USER_IDS=manager-discord-user-id,owner-discord-user-id
VEX_NODE_TECH_OPS_USER_IDS=owner-discord-user-id
VEX_NODE_SESSION_SECRET=at-least-32-random-bytes
DISCORD_GUILD_ID=your-discord-server-id
VEX_NODE_TWITCH_BROADCASTER_LOGIN=vexoncore
TWITCH_CLIENT_ID=your-twitch-client-id
TWITCH_ACCESS_TOKEN=your-broadcaster-user-access-token
TWITCH_REFRESH_TOKEN=your-broadcaster-user-refresh-token
GEMINI_API_KEY=your-google-ai-studio-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-side-service-role-key
```

Use Discord role IDs (not names) in `VEX_NODE_ALLOWED_ROLE_IDS`; include the staff, moderator, and administrator roles that should enter VEX-NODE. Generate `VEX_NODE_SESSION_SECRET` with a cryptographically secure random generator (for example, `openssl rand -base64 32`). The session is encrypted, HttpOnly, short-lived, and the member role is checked with Discord on every dashboard request. The Supabase service-role key remains server-side. Apply all migrations in `supabase/migrations/`, including the heartbeat, moderation archive, and studio tasks migrations. The bot reads the forum channel configured by `MODERATION_CASE_CHANNEL_ID`, imports active and archived case threads and copies attachments up to 25 MB into the private `moderation-evidence` bucket. It also snapshots current Discord bans every six hours, updates those records on ban/unban events, and archives actions executed with its ban, kick, timeout, untimeout, warn, and warn-clear commands. New or updated forum posts are synced when messages arrive. VEX-NODE searches the full imported archive with pagination; the “Sync Twitch bans” action reads the current list for `VEX_NODE_TWITCH_BROADCASTER_LOGIN` (defaults to `vexoncore`) and stores it in the same archive. Authorize Twitch at `/api/twitch/login` with `moderation:read:banned_users`, then save both returned token values in Vercel and redeploy. The ban-sync action requires a valid user access token; reauthorize and update the token when Twitch expires it.

Staff can start Discord authentication at `/staff-login` or directly at `/api/vex-node/login`. Authentication identifies the Discord account; the configured server-role checks still determine whether it can access the staff dashboard or editor.

Set `VEX_NODE_EDITOR_ROLE_IDS` to the Discord role ID(s) permitted to use the standalone `/editor` workspace. Editor-only accounts can sign in and see only the editor launch panel in VEX-NODE; the rest of the control dashboard still requires a role in `VEX_NODE_ALLOWED_ROLE_IDS`. The editor checks Discord membership on both its access endpoint and the dashboard link. Keep `VEX_NODE_EDITOR_ROLE_IDS` separate from the staff allowlist unless editors should also access staff modules.

Planner and Tech Ops now have a client UI and protected Vercel API routes, but need a valid `GEMINI_API_KEY`, per-assistant Discord user-ID allowlists, and the `20261115004000_studio_tasks.sql` migration before use. Set `VEX_NODE_PLANNER_USER_IDS` to the manager and owner IDs, and `VEX_NODE_TECH_OPS_USER_IDS` to the owner ID; each authorized account gets its own independent session. The implementation uses Google’s official `@google/genai` Live API because its documented client supports constrained ephemeral tokens and bidirectional audio; the confirmed model ID is `gemini-3.8-live`. Token creation and every tool request re-check the VEX-NODE Discord role and assistant-specific account allowlist. Planner can list/create Supabase studio tasks; Tech Ops can read the Supabase heartbeat and authorized host telemetry. The browser requests microphone access only after the user starts a session, streams 16 kHz PCM, plays 24 kHz PCM, renders transcripts, and ends after 45 seconds without voice activity. The exact `google/gemini-3.8-live` Gateway identifier is not used. ShiftStream now has a standalone Next.js app with invite-only Supabase email login, Twitch and Google OAuth, encrypted provider tokens, and manual schedule-to-calendar sync. Its Supabase migration and OAuth/environment configuration must be applied before managers can connect accounts; see `shiftstream/README.md`. The standalone `/editor` workspace uses ffmpeg.wasm for two composited video tracks and an audio track, with video/audio trimming, draggable clip repositioning, track selection, and clip deletion (including Delete/Backspace). It imports PNG, JPEG, and WebP stills as image overlays with editable duration, scale, and position, alongside video and audio media. MP4 rendering and download happen client-side. Media stays in the browser; editor files are limited to 1 GB each / 1 GB total and the timeline to 20 minutes. These are browser-memory limits, not a guarantee that every device can render a project at the maximum size. The production dashboard needs `VITE_SHIFTSTREAM_URL` set to the deployed ShiftStream URL before its launch link appears. Live event streams and firewall telemetry remain unavailable until their sources are connected.

On-premises host telemetry

Apply `supabase/migrations/20261115010000_host_telemetry.sql`, then set the server-side Vercel Production variable `HOST_TELEMETRY_AGENT_TOKEN` to a new random secret and redeploy. Copy `host-telemetry/agent.mjs` to each host with Node.js 18.17 or newer. Configure these environment variables on each host:

```text
VEXON_TELEMETRY_URL=https://www.vixon.online/api/host-telemetry
VEXON_TELEMETRY_TOKEN=the-same-secret-as-HOST_TELEMETRY_AGENT_TOKEN
VEXON_HOST_ID=a-unique-id-such-as-minecraft-01
VEXON_HOST_NAME=a-friendly-label
```

Run the agent with `node agent.mjs`. It reports CPU, available memory, platform, and uptime every 60 seconds over outbound HTTPS. It does not open ports, send private IPs, run commands, or expose host data to users without the Tech Ops allowlist. Tech Ops can view the latest report per host; historical samples and service/process checks are not collected.

Terms of Service (TOS)

By accessing or using this project, you agree to the following terms. This README is a project notice and does not replace a separately signed license agreement.

1. Ownership & Copyright Jeremiah_YT and VexonStudio retain all ownership and copyright in Vixon/Vexon SYS, including the source code, assets, documentation, branding, API integrations, and updates. Any source code copied, retained, redistributed, or used without the required permission will be treated as stolen and unauthorized VexonStudio and Jeremiah_YT code.

2. Patreon License Requirement Use, possession, or modification of the source code, updates, installation materials, API-key updates, or related support is permitted only after the applicable Patreon tier has been paid for and while its permission remains valid, or after a separate source-code license has been purchased from Jeremiah_YT or VexonStudio. A Patreon subscription does not transfer ownership of the project.

3. Permitted Changes Only a user who has paid for the qualifying Patreon tier or purchased a paid source-code license may install, configure, or modify an authorized copy for their own use. Payment must occur before any modification is made. Any changes must remain subject to these terms. Redistribution, resale, sublicensing, public reposting, or claiming authorship is not permitted unless Jeremiah_YT or VexonStudio provides written permission.

4. Notice of Use Users must inform Jeremiah_YT or VexonStudio staff before using, deploying, or materially modifying the website or its source code under a Patreon-based permission. Unauthorized use, including use without the required payment or notice, may result in a copyright complaint, DMCA takedown request, termination of permission, and other remedies available under applicable law.

5. Nonrenewal If a user stops renewing the qualifying Patreon subscription, permission to receive future updates, API-key updates, installation assistance, and support ends. The user agrees to keep their authorized version up to date with required security and compatibility updates after nonrenewal, where updates are made available, and remains responsible for their continued use of the code. Nonrenewal does not grant permission to obtain or use future paid updates without a new qualifying payment or written license.

6. No Warranty or Responsibility Vixon/Vexon SYS is provided as-is. Jeremiah_YT and VexonStudio are not responsible for the user's deployment, modifications, API keys, infrastructure, security practices, downtime, data loss, legal compliance, or any damages arising from the user's use of the code. Users are responsible for securing their own credentials and complying with all third-party platform terms.

7. Prohibited Actions Unauthorized copying, possession, retention, forking, distribution, resale, commercial use, attribution theft, or incorporation into another project is prohibited. Code that is not covered by a paid Patreon tier, paid source-code license, or written permission must not be kept or used and may be treated as stolen VexonStudio and Jeremiah_YT code. The same restrictions apply to API keys, installation materials, updates, and support content supplied through Patreon.

8. AI Disclaimer Jeremiah_YT and VexonStudio hold no responsibility regarding the use of Google AI or any related AI services that interact with this project. Any outcomes or consequences from AI tools are the sole responsibility of the user.

Contact & Licensing

For inquiries regarding licensing, commercial permissions, or professional collaboration, you may get in contact with me via my official portfolio:

👉[ Contact Jeremiah_YT](https://jeremiah-portfolio-mu.vercel.app)



Notice: Use the project only under an active qualifying Patreon subscription, a separate paid source-code license, or written permission from Jeremiah_YT or VexonStudio. Unauthorized use may be met with a DMCA takedown request and other appropriate legal action.
