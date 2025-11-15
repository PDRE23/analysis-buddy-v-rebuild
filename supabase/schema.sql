-- Supabase schema for Analysis Buddy V2
-- Run in the SQL editor or via migrations

create table if not exists public.user_deals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  deal jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_analyses (
  id text primary key,
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

-- Enable Row Level Security
alter table public.user_deals enable row level security;
alter table public.user_analyses enable row level security;

-- RLS Policies: Users can only access their own data
create policy "Users can view their own deals"
  on public.user_deals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own deals"
  on public.user_deals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own deals"
  on public.user_deals for update
  using (auth.uid() = user_id);

create policy "Users can delete their own deals"
  on public.user_deals for delete
  using (auth.uid() = user_id);

create policy "Users can view their own analyses"
  on public.user_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own analyses"
  on public.user_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own analyses"
  on public.user_analyses for update
  using (auth.uid() = user_id);

create policy "Users can delete their own analyses"
  on public.user_analyses for delete
  using (auth.uid() = user_id);
