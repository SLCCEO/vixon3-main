import { requireManagerPage } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import Dashboard from "./Dashboard";

type SearchParams = Promise<{ connection?: string }>;

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const missingSetup = [
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
    ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
    ["SHIFTSTREAM_ALLOWED_EMAILS", process.env.SHIFTSTREAM_ALLOWED_EMAILS],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingSetup.length) {
    return (
      <main className="setup">
        <h1>ShiftStream setup required</h1>
        <p>Configure these environment variables in the ShiftStream deployment: {missingSetup.join(", ")}.</p>
      </main>
    );
  }

  const { user } = await requireManagerPage();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("shiftstream_connections")
    .select("provider, provider_login, updated_at")
    .eq("user_id", user.id);
  if (error) {
    throw new Error("Unable to load ShiftStream connections.");
  }

  const query = await searchParams;
  const connections = {
    twitch: (data ?? []).find((item) => item.provider === "twitch") ?? null,
    google: (data ?? []).find((item) => item.provider === "google") ?? null,
  };

  return (
    <Dashboard
      email={user.email ?? ""}
      connections={connections}
      connectionStatus={query.connection ?? ""}
    />
  );
}
