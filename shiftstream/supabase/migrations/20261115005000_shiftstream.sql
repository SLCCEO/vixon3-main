create table if not exists public.shiftstream_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('twitch', 'google')),
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at timestamptz not null,
  provider_account_id text not null,
  provider_login text,
  scopes text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.shiftstream_connections enable row level security;
revoke all on table public.shiftstream_connections from anon, authenticated;
grant all on table public.shiftstream_connections to service_role;
