# Spike: Supabase Realtime Split

## Question

Can Supabase Realtime Broadcast handle ephemeral bus GPS while Postgres Changes handles durable `stop_logs` updates for the admin/dashboard flow?

## Kill question

If Broadcast reconnect or latency is visibly unreliable for 2-4 buses sending every 3-5 seconds, or if stop log changes are not reliably observed through Postgres Changes, the realtime architecture needs to change before production implementation.

## Prototype

A standalone browser page with three modes:

- Driver broadcaster: emits fake moving GPS positions for 1, 2, or 4 buses every 3 seconds.
- Rider/admin subscriber: listens on `route:{route_id}:positions`, shows latest position and latency per bus.
- Stop-log listener: subscribes to Postgres Changes on `stop_logs`; optional insert helper calls an RPC named `spike_insert_stop_log` if present.

The GPS path uses Supabase Broadcast only. It does not write GPS pings to Postgres.

## Run locally

From repo root:

```bash
python3 -m http.server 4173 --directory prototypes/spikes
```

Open:

```text
http://localhost:4173/002-supabase-realtime-split/
```

## Required Supabase setup for real validation

Use a non-production Supabase project.

Minimum for Broadcast-only GPS test:

- Supabase project URL
- Supabase anon key
- Realtime enabled

For Postgres Changes stop-log test, create a test `stop_logs` table and enable Realtime publication for it. Example SQL shape:

```sql
create table if not exists public.stop_logs (
  id uuid primary key default gen_random_uuid(),
  route_id text not null,
  bus_id text not null,
  stop_id text not null,
  arrived_at timestamptz not null default now(),
  boarded integer not null default 0,
  alighted integer not null default 0,
  created_at timestamptz not null default now()
);

alter publication supabase_realtime add table public.stop_logs;
```

Optional insert helper for the prototype button:

```sql
create or replace function public.spike_insert_stop_log(
  p_route_id text,
  p_bus_id text,
  p_stop_id text,
  p_boarded integer,
  p_alighted integer
)
returns public.stop_logs
language sql
security definer
as $$
  insert into public.stop_logs (route_id, bus_id, stop_id, boarded, alighted)
  values (p_route_id, p_bus_id, p_stop_id, p_boarded, p_alighted)
  returning *;
$$;
```

Do not use production data or service role keys.

## Pressure tests

- Broadcast: 1 bus every 3 seconds.
- Broadcast: 2 buses every 3 seconds.
- Broadcast: 4 buses every 3 seconds.
- Subscriber: confirm latest position and latency updates per bus.
- Reconnect: disable/re-enable network or close/reopen subscriber tab.
- Durable facts: insert a stop log and confirm Postgres Changes event appears separately.
- Confirm no database write occurs per GPS ping.

## Verdict

Pending real Supabase test.
