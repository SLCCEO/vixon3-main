Vixon / Vexon SYS

Created by: Jeremiah_YT

Copyright: © 2026 Jeremiah_YT. All rights reserved.

This project is a React + TypeScript + Vite template providing a minimal setup for building web applications. It includes HMR (Hot Module Replacement) and ESLint rules for clean, maintainable code.



Official Links

Live Example: https://vixon3.vercel.app

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

Twitch streamer data

The `/streamers` page requests `/api/twitch`. Configure these server-side Vercel environment variables before deployment:

```text
TWITCH_CLIENT_ID=your-twitch-client-id
TWITCH_CLIENT_SECRET=your-twitch-client-secret
TWITCH_ACCESS_TOKEN=your-broadcaster-user-access-token
TWITCH_REFRESH_TOKEN=your-broadcaster-refresh-token

To authorize the Twitch follower token, register `https://www.vixon.online/api/twitch-callback` as the OAuth redirect URL, then open `https://www.vixon.online/api/twitch-login`.
```

The Twitch client secret, access token, and refresh token must never use a `VITE_` prefix because they must not be sent to the browser. Create both tokens by authorizing the Vexon Twitch account with the `moderator:read:followers` scope. The endpoint uses the app token for profiles and refreshes the broadcaster user token before reading follower totals. Without the user token or required scope, profiles still load but follower totals show `Followers unavailable`.

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
