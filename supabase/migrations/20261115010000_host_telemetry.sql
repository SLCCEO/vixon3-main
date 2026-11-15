CREATE TABLE IF NOT EXISTS public.host_telemetry (
  host_id TEXT PRIMARY KEY CHECK (char_length(host_id) BETWEEN 1 AND 64),
  host_name TEXT NOT NULL CHECK (char_length(host_name) BETWEEN 1 AND 128),
  platform TEXT NOT NULL CHECK (char_length(platform) BETWEEN 1 AND 16),
  cpu_percent DOUBLE PRECISION NOT NULL CHECK (cpu_percent BETWEEN 0 AND 100),
  memory_total_bytes BIGINT NOT NULL CHECK (memory_total_bytes > 0),
  memory_available_bytes BIGINT NOT NULL CHECK (
    memory_available_bytes >= 0 AND memory_available_bytes <= memory_total_bytes
  ),
  uptime_seconds BIGINT NOT NULL CHECK (uptime_seconds >= 0),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.host_telemetry ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.host_telemetry FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.host_telemetry TO service_role;
