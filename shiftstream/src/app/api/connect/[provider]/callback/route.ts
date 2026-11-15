import { NextRequest, NextResponse } from "next/server";
import { AccessError, requireManager } from "@/lib/auth";
import { saveConnection, type Provider } from "@/lib/connections";

function isProvider(value: string): value is Provider {
  return value === "twitch" || value === "google";
}

function callbackUri(provider: Provider) {
  return provider === "twitch"
    ? process.env.TWITCH_REDIRECT_URI
    : process.env.GOOGLE_REDIRECT_URI;
}

function resultRedirect(request: NextRequest, status: string) {
  const target = new URL("/", request.url);
  target.searchParams.set("connection", status);
  const response = NextResponse.redirect(target);
  return response;
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
    const { user } = await requireManager();
    const stateCookie = request.cookies.get(`ss_oauth_${rawProvider}_state`)?.value;
    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    const providerError = request.nextUrl.searchParams.get("error");

    if (providerError || !stateCookie || state !== stateCookie || !code) {
      return resultRedirect(request, "failed");
    }

    const clientId =
      rawProvider === "twitch"
        ? process.env.TWITCH_CLIENT_ID
        : process.env.GOOGLE_CLIENT_ID;
    const clientSecret =
      rawProvider === "twitch"
        ? process.env.TWITCH_CLIENT_SECRET
        : process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = callbackUri(rawProvider);
    if (!clientId || !clientSecret || !redirectUri) {
      return resultRedirect(request, "not-configured");
    }

    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });
    const tokenResponse = await fetch(
      rawProvider === "twitch"
        ? "https://id.twitch.tv/oauth2/token"
        : "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody,
        cache: "no-store",
      },
    );
    if (!tokenResponse.ok) {
      return resultRedirect(request, "failed");
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
      token_type?: string;
    };
    if (!tokenData.access_token || !Number.isFinite(tokenData.expires_in)) {
      return resultRedirect(request, "failed");
    }

    let accountId: string;
    let login: string | null = null;
    let scopes: string[];

    if (rawProvider === "twitch") {
      const profileResponse = await fetch("https://api.twitch.tv/helix/users", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Client-Id": clientId,
        },
        cache: "no-store",
      });
      if (!profileResponse.ok) return resultRedirect(request, "failed");
      const profile = (await profileResponse.json()) as {
        data?: Array<{ id: string; login: string }>;
      };
      const twitchUser = profile.data?.[0];
      if (!twitchUser) return resultRedirect(request, "failed");
      accountId = twitchUser.id;
      login = twitchUser.login;
      scopes = tokenData.scope?.split(" ") ?? [];
    } else {
      const profileResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
          cache: "no-store",
        },
      );
      if (!profileResponse.ok) return resultRedirect(request, "failed");
      const profile = (await profileResponse.json()) as {
        id?: string;
        email?: string;
      };
      if (!profile.id) return resultRedirect(request, "failed");
      accountId = profile.id;
      login = profile.email ?? null;
      scopes = tokenData.scope?.split(" ") ?? [];
    }

    await saveConnection({
      userId: user.id,
      provider: rawProvider,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresIn: tokenData.expires_in,
      accountId,
      login,
      scopes,
    });

    const response = resultRedirect(request, `${rawProvider}-connected`);
    response.cookies.delete(`ss_oauth_${rawProvider}_state`);
    return response;
  } catch (error) {
    if (error instanceof AccessError && error.status === 401) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    console.error("ShiftStream OAuth callback failed:", error);
    return resultRedirect(request, "failed");
  }
}
