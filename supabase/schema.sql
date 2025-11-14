-- Supabase schema for Analysis Buddy V2
-- Run in the SQL editor or via migrations

create table if not exists public.user_deals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  deal jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_analyses (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_deals_user_idx on public.user_deals (user_id);
create index if not exists user_analyses_user_idx on public.user_analyses (user_id);

create or replace function public.touch_user_deals()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_user_analyses()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_deals_updated_at on public.user_deals;
create trigger trg_user_deals_updated_at
before update on public.user_deals
for each row
execute procedure public.touch_user_deals();

drop trigger if exists trg_user_analyses_updated_at on public.user_analyses;
create trigger trg_user_analyses_updated_at
before update on public.user_analyses
for each row
execute procedure public.touch_user_analyses();

