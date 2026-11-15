CREATE TABLE IF NOT EXISTS public.system_heartbeat (
  service TEXT PRIMARY KEY,
  last_seen_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.system_heartbeat ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.system_heartbeat FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.system_heartbeat TO service_role;
