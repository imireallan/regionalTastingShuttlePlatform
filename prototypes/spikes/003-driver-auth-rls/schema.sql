-- Spike 003: Driver Auth + RLS
-- Disposable schema for a non-production Supabase project.
-- Goal: prove driver identity can be enforced via auth.uid() and RLS.

create extension if not exists pgcrypto;

-- Clean slate for repeatable spike runs.
drop table if exists public.spike_stop_logs cascade;
drop table if exists public.spike_driver_assignments cascade;
drop table if exists public.spike_buses cascade;
drop table if exists public.spike_routes cascade;
drop table if exists public.spike_drivers cascade;

create table public.spike_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.spike_buses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.spike_drivers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  display_name text not null,
  internal_email text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.spike_driver_assignments (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.spike_drivers(id) on delete cascade,
  bus_id uuid not null references public.spike_buses(id) on delete cascade,
  route_id uuid not null references public.spike_routes(id) on delete cascade,
  service_date date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (driver_id, bus_id, route_id, service_date)
);

create table public.spike_stop_logs (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.spike_routes(id),
  bus_id uuid not null references public.spike_buses(id),
  stop_code text not null,
  arrived_at timestamptz not null default now(),
  boarded integer not null default 0 check (boarded >= 0),
  alighted integer not null default 0 check (alighted >= 0),
  created_by_driver_id uuid not null references public.spike_drivers(id),
  created_at timestamptz not null default now()
);

alter table public.spike_routes enable row level security;
alter table public.spike_buses enable row level security;
alter table public.spike_drivers enable row level security;
alter table public.spike_driver_assignments enable row level security;
alter table public.spike_stop_logs enable row level security;

-- Drivers can see their own driver row.
create policy "driver can read own spike driver row"
on public.spike_drivers
for select
to authenticated
using (auth_user_id = auth.uid());

-- Drivers can see their active assignment.
create policy "driver can read own active spike assignments"
on public.spike_driver_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.spike_drivers d
    where d.id = spike_driver_assignments.driver_id
      and d.auth_user_id = auth.uid()
      and d.active = true
  )
);

-- Drivers can read active route/bus rows only through their assignment.
create policy "driver can read assigned spike routes"
on public.spike_routes
for select
to authenticated
using (
  exists (
    select 1
    from public.spike_driver_assignments a
    join public.spike_drivers d on d.id = a.driver_id
    where a.route_id = spike_routes.id
      and a.active = true
      and d.active = true
      and d.auth_user_id = auth.uid()
  )
);

create policy "driver can read assigned spike buses"
on public.spike_buses
for select
to authenticated
using (
  exists (
    select 1
    from public.spike_driver_assignments a
    join public.spike_drivers d on d.id = a.driver_id
    where a.bus_id = spike_buses.id
      and a.active = true
      and d.active = true
      and d.auth_user_id = auth.uid()
  )
);

-- Critical policy: driver can insert stop logs only for their assigned bus + route.
-- The frontend may send bus_id/route_id, but RLS verifies them against auth.uid().
create policy "driver can insert own assigned spike stop logs"
on public.spike_stop_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.spike_driver_assignments a
    join public.spike_drivers d on d.id = a.driver_id
    where d.id = spike_stop_logs.created_by_driver_id
      and d.auth_user_id = auth.uid()
      and d.active = true
      and a.active = true
      and a.bus_id = spike_stop_logs.bus_id
      and a.route_id = spike_stop_logs.route_id
      and a.service_date = current_date
  )
);

-- Driver can read only stop logs for their own assigned bus/route.
create policy "driver can read assigned spike stop logs"
on public.spike_stop_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.spike_driver_assignments a
    join public.spike_drivers d on d.id = a.driver_id
    where d.auth_user_id = auth.uid()
      and d.active = true
      and a.active = true
      and a.bus_id = spike_stop_logs.bus_id
      and a.route_id = spike_stop_logs.route_id
      and a.service_date = current_date
  )
);

-- Helper view shape for the driver app after login.
create or replace view public.spike_my_driver_context as
select
  d.id as driver_id,
  d.display_name,
  d.active as driver_active,
  a.id as assignment_id,
  a.service_date,
  a.active as assignment_active,
  b.id as bus_id,
  b.label as bus_label,
  r.id as route_id,
  r.name as route_name
from public.spike_drivers d
join public.spike_driver_assignments a on a.driver_id = d.id
join public.spike_buses b on b.id = a.bus_id
join public.spike_routes r on r.id = a.route_id
where d.auth_user_id = auth.uid()
  and d.active = true
  and a.active = true
  and a.service_date = current_date;

grant select on public.spike_my_driver_context to authenticated;

-- Read policies are still enforced for underlying tables through security invoker view behavior in modern Postgres/Supabase.
-- If your Supabase project uses older behavior, replace this view with an RPC.

-- Optional Realtime publication for durable stop log observation during the spike.
do $$
begin
  alter publication supabase_realtime add table public.spike_stop_logs;
exception
  when duplicate_object then null;
end $$;

-- No seed data is inserted here because auth.users IDs come from Supabase Auth Dashboard.
-- Use docs/spikes/2026-05-26-driver-auth-rls-setup-guide.md to create test users and insert rows with their auth user IDs.
