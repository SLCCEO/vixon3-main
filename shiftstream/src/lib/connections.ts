import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/crypto";

export type Provider = "twitch" | "google";

export type StoredConnection = {
  user_id: string;
  provider: Provider;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string;
  provider_account_id: string;
  provider_login: string | null;
  scopes: string[];
};

export type ProviderConnection = Omit<
  StoredConnection,
  "access_token_encrypted" | "refresh_token_encrypted"
> & {
  accessToken: string;
  refreshToken: string | null;
};

export async function saveConnection(input: {
  userId: string;
  provider: Provider;
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  accountId: string;
  login: string | null;
  scopes: string[];
}) {
  const admin = createSupabaseAdminClient();
  let retainedRefreshToken = input.refreshToken;

  if (!retainedRefreshToken) {
    const { data: existing, error } = await admin
      .from("shiftstream_connections")
      .select("refresh_token_encrypted")
      .eq("user_id", input.userId)
      .eq("provider", input.provider)
      .maybeSingle();
    if (error) throw new Error("Unable to read the existing provider connection.");
    if (existing?.refresh_token_encrypted) {
      retainedRefreshToken = decryptToken(existing.refresh_token_encrypted);
    }
  }

  const { error } = await admin.from("shiftstream_connections").upsert(
    {
      user_id: input.userId,
      provider: input.provider,
      access_token_encrypted: encryptToken(input.accessToken),
      refresh_token_encrypted: retainedRefreshToken
        ? encryptToken(retainedRefreshToken)
        : null,
      expires_at: new Date(Date.now() + input.expiresIn * 1000).toISOString(),
      provider_account_id: input.accountId,
      provider_login: input.login,
      scopes: input.scopes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error("Unable to save the provider connection.");
}

export async function getConnection(userId: string, provider: Provider) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("shiftstream_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) throw new Error(`Unable to load the ${provider} connection.`);
  if (!data) return null;

  const row = data as StoredConnection;
  return {
    ...row,
    accessToken: decryptToken(row.access_token_encrypted),
    refreshToken: row.refresh_token_encrypted
      ? decryptToken(row.refresh_token_encrypted)
      : null,
  } satisfies ProviderConnection;
}

export async function updateConnectionTokens(
  connection: ProviderConnection,
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number,
) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("shiftstream_connections")
    .update({
      access_token_encrypted: encryptToken(accessToken),
      refresh_token_encrypted: refreshToken
        ? encryptToken(refreshToken)
        : connection.refreshToken
          ? encryptToken(connection.refreshToken)
          : null,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", connection.user_id)
    .eq("provider", connection.provider);
  if (error) throw new Error(`Unable to refresh the ${connection.provider} connection.`);
}

export async function getValidAccessToken(
  userId: string,
  provider: Provider,
): Promise<{ token: string; connection: ProviderConnection }> {
  const connection = await getConnection(userId, provider);
  if (!connection) {
    throw new Error(`Connect ${provider === "google" ? "Google Calendar" : "Twitch"} first.`);
  }

  if (new Date(connection.expires_at).getTime() > Date.now() + 60_000) {
    return { token: connection.accessToken, connection };
  }
  if (!connection.refreshToken) {
    throw new Error(`Reconnect ${provider === "google" ? "Google Calendar" : "Twitch"} to continue.`);
  }

  const tokenUrl =
    provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : "https://id.twitch.tv/oauth2/token";
  const clientId =
    provider === "google"
      ? process.env.GOOGLE_CLIENT_ID
      : process.env.TWITCH_CLIENT_ID;
  const clientSecret =
    provider === "google"
      ? process.env.GOOGLE_CLIENT_SECRET
      : process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(`${provider} OAuth credentials are not configured.`);
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: connection.refreshToken,
  });
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Unable to refresh the ${provider} authorization. Reconnect the account.`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  const refreshToken = payload.refresh_token ?? connection.refreshToken;
  await updateConnectionTokens(
    connection,
    payload.access_token,
    refreshToken,
    payload.expires_in,
  );

  return { token: payload.access_token, connection };
}
