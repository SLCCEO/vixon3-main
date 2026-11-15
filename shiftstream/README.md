# ShiftStream

ShiftStream is a standalone Next.js app for invited stream managers. It reads a connected Twitch broadcaster's schedule and mirrors up to 25 upcoming schedule slots into the connected Google account's primary calendar. Repeated syncs update the same events instead of creating duplicates.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set the Supabase URL, anon key, service-role key, and the comma-separated manager email allowlist.
3. Generate an encryption key with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` and set it as `SHIFTSTREAM_TOKEN_ENCRYPTION_KEY`.
4. Create Twitch and Google OAuth applications and fill in their client IDs, secrets, and exact callback URLs from `.env.example`.
5. Apply `supabase/migrations/20261115005000_shiftstream.sql` to the Supabase project.
6. In Supabase Auth, allow the local and deployed ShiftStream callback URLs. Enable email OTP for manager sign-in.
7. Enable the Google Calendar API and add its redirect URI to the OAuth client. ShiftStream requests the `calendar.events` scope.
8. Add `http://localhost:3000/api/connect/twitch/callback` and `http://localhost:3000/api/connect/google/callback` as the exact OAuth redirect URLs.
9. Run `npm run dev`, then sign in using an allowlisted email and connect both providers.

## Production

Deploy this folder as its own Vercel project by setting the Vercel Root Directory to `shiftstream`. Add all variables from `.env.example` to the production environment and update the OAuth callback URLs to the deployed origin. Keep the Supabase service-role key, provider secrets, and encryption key server-only; only the Supabase URL and anon key are public.

The app stores provider tokens encrypted with AES-256-GCM in a private Supabase table accessible only through server-side service-role code. Sync runs only after a manager session is revalidated. Removed Twitch schedule slots are not deleted from Google Calendar.
