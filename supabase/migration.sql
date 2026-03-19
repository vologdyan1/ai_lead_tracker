-- AI Lead Tracker schema
-- Run this script in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  source text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'lost', 'won')),
  notes text,
  ai_summary text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_user_id on public.leads(user_id);
create index if not exists idx_leads_created_at on public.leads(created_at desc);
create index if not exists idx_lead_events_lead_id on public.lead_events(lead_id);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row
execute procedure public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- Backfill profiles for users created before this migration.
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;

drop policy if exists "Profiles can view own profile" on public.profiles;
create policy "Profiles can view own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Profiles can update own profile" on public.profiles;
create policy "Profiles can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can view own leads" on public.leads;
create policy "Users can view own leads"
on public.leads
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own leads" on public.leads;
create policy "Users can insert own leads"
on public.leads
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own leads" on public.leads;
create policy "Users can update own leads"
on public.leads
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own leads" on public.leads;
create policy "Users can delete own leads"
on public.leads
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own lead events" on public.lead_events;
create policy "Users can view own lead events"
on public.lead_events
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own lead events" on public.lead_events;
create policy "Users can insert own lead events"
on public.lead_events
for insert
with check (auth.uid() = user_id);
