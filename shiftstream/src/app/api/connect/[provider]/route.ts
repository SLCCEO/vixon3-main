import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { AccessError, requireManager } from "@/lib/auth";

type Provider = "twitch" | "google";

function isProvider(value: string): value is Provider {
  return value === "twitch" || value === "google";
}

function redirectUri(provider: Provider) {
  return provider === "twitch"
    ? process.env.TWITCH_REDIRECT_URI
    : process.env.GOOGLE_REDIRECT_URI;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await context.params;
  if (!isProvider(rawProvider)) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
  }

  try {
    await requireManager();
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to authorize this request." },
      { status },
    );
  }

  const clientId =
    rawProvider === "twitch"
      ? process.env.TWITCH_CLIENT_ID
      : process.env.GOOGLE_CLIENT_ID;
  const callback = redirectUri(rawProvider);
  if (!clientId || !callback) {
    return NextResponse.json(
      { error: `${rawProvider} OAuth is not configured.` },
      { status: 503 },
    );
  }

  const state = randomBytes(32).toString("base64url");
  const authUrl = new URL(
    rawProvider === "twitch"
      ? "https://id.twitch.tv/oauth2/authorize"
      : "https://accounts.google.com/o/oauth2/v2/auth",
  );
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callback);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  if (rawProvider === "twitch") {
    authUrl.searchParams.set("scope", "channel:read:stream_schedule");
  } else {
    authUrl.searchParams.set(
      "scope",
      "openid email https://www.googleapis.com/auth/calendar.events",
    );
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("include_granted_scopes", "true");
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(`ss_oauth_${rawProvider}_state`, state, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
