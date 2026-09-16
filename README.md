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
```

The Twitch client secret must never use a `VITE_` prefix because it must not be sent to the browser. The endpoint loads Twitch profile data and attempts to load follower totals. Twitch may require a broadcaster or moderator-authorized user token for follower totals; when that authorization is unavailable, the page keeps the channel link and shows `Followers unavailable`.

Homepage social statistics

The homepage dashboard requests `/api/social-stats` for YouTube subscribers, TikTok followers, and Discord members. Configure these server-side Vercel environment variables:

```text
YOUTUBE_API_KEY=your-youtube-data-api-key
YOUTUBE_CHANNEL_ID=your-youtube-channel-id
TIKTOK_ACCESS_TOKEN=your-tiktok-user-access-token
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_GUILD_ID=your-discord-server-id
```

Enable the YouTube Data API v3 for the Google key. Authorize the TikTok account through Login Kit with both `user.info.basic` and `user.info.stats`; the latter provides follower, following, likes, and video counts. The token must belong to the account whose follower count should be displayed. Invite the Discord bot to the server and enable the Server Members Intent if your bot setup requires it. Missing or unauthorized services return `null` for that card while the other counts continue loading.

Terms of Service (TOS)

By accessing this project, you agree to the following legally binding terms:

1. Ownership & Copyright Jeremiah_YT retains all ownership and copyright of Vixon/Vexon SYS. This includes, but is not limited to, all source code, assets, documentation, and branding.

2. Absolute Prohibition of Use Any use of the code within this project—including but not limited to copying, forking, modifying, distributing, or incorporating it into other projects—is strictly prohibited. Any unauthorized use of the source code is considered a direct violation of copyright law and will be treated as copyright infringement.

3. Liability Vixon/Vexon SYS is provided for demonstration purposes only. Jeremiah_YT is not liable for any damages or issues arising from the viewing or unauthorized use of this software.

4. Prohibited Actions * No Modification: You may not modify, fork, or alter this project in any way.



No Distribution: You may not share or redistribute the source code in any format.

No Commercial Use: You may not use any part of this project for commercial gain.

No Attribution Theft: Do not attempt to bypass copyright or claim authorship.

5. AI Disclaimer Jeremiah_YT holds no responsibility regarding the use of Google AI or any related AI services that interact with this project. Any outcomes or consequences from AI tools are the sole responsibility of the user.

Contact & Licensing

For inquiries regarding licensing, commercial permissions, or professional collaboration, you may get in contact with me via my official portfolio:

👉[ Contact Jeremiah_YT](https://jeremiah-portfolio-mu.vercel.app)



Notice: Unauthorized use of this project will be met with appropriate legal action.
