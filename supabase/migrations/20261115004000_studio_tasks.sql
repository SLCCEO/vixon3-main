CREATE TABLE IF NOT EXISTS public.studio_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
  due_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS studio_tasks_status_due_at_idx
  ON public.studio_tasks (status, due_at ASC NULLS LAST, created_at DESC);

ALTER TABLE public.studio_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.studio_tasks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.studio_tasks TO service_role;
