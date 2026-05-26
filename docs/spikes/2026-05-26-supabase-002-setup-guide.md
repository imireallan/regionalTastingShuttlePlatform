# Supabase Setup Guide for Spike 002: Realtime Split

Date: 2026-05-26

## Goal

Configure a non-production Supabase project so the `002-supabase-realtime-split` prototype can test:

1. Supabase Broadcast for ephemeral GPS positions.
2. Postgres Changes for durable `stop_logs` events.
3. The separation between live GPS and business records.

Do not use production data. Do not use a service role key in the browser.

## Step 1: Create or choose a test Supabase project

Use a disposable Supabase project if possible.

Recommended name:

```text
regional-tasting-shuttle-spikes
```

After the project is ready, open:

```text
Project Settings -> API
```

Copy:

- Project URL
- anon public key

Do not copy the service role key into the prototype.

## Step 2: Create the test schema

Open:

```text
SQL Editor -> New query
```

Run:

```sql
create extension if not exists pgcrypto;

create table if not exists public.stop_logs (
  id uuid primary key default gen_random_uuid(),
  route_id text not null,
  bus_id text not null,
  stop_id text not null,
  arrived_at timestamptz not null default now(),
  boarded integer not null default 0 check (boarded >= 0),
  alighted integer not null default 0 check (alighted >= 0),
  created_at timestamptz not null default now()
);

create index if not exists stop_logs_route_created_idx
on public.stop_logs (route_id, created_at desc);

create index if not exists stop_logs_bus_created_idx
on public.stop_logs (bus_id, created_at desc);
```

## Step 3: Enable Realtime for `stop_logs`

Still in SQL Editor, run:

```sql
alter publication supabase_realtime add table public.stop_logs;
```

If Supabase says the table is already a member of the publication, that is fine.

Alternative dashboard path:

```text
Database -> Replication -> supabase_realtime -> Enable public.stop_logs
```

## Step 4: Add temporary spike-only RLS policies

For this spike, we want the browser anon key to insert/select stop logs so we can validate Postgres Changes quickly.

This is intentionally permissive and must not be copied into production.

Run:

```sql
alter table public.stop_logs enable row level security;

create policy "spike anon can read stop_logs"
on public.stop_logs
for select
to anon
using (true);

create policy "spike anon can insert stop_logs"
on public.stop_logs
for insert
to anon
with check (true);
```

Production will use stricter driver/admin policies. This is only for spike 002.

## Step 5: Create the optional insert RPC

The prototype can listen to Postgres Changes without this RPC if you insert rows manually in SQL.

But the page has an `Insert test stop_log via RPC` button. To use that button, run:

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
security invoker
set search_path = public
as $$
  insert into public.stop_logs (route_id, bus_id, stop_id, boarded, alighted)
  values (p_route_id, p_bus_id, p_stop_id, p_boarded, p_alighted)
  returning *;
$$;

grant execute on function public.spike_insert_stop_log(text, text, text, integer, integer) to anon;
```

## Step 6: Verify table and RPC quickly

Run this in SQL Editor:

```sql
select public.spike_insert_stop_log(
  'demo-route-1',
  'bus-1',
  'stop-1',
  2,
  0
);

select *
from public.stop_logs
order by created_at desc
limit 5;
```

Expected:

- One new `stop_logs` row exists.
- No errors from the RPC.

## Step 7: Open the local prototype

Make sure the local static server is running:

```bash
cd /Users/allanimire/projects/RegionalTastingShuttlePlatform
python3 -m http.server 4173 --directory prototypes/spikes
```

Open:

```text
http://localhost:4173/002-supabase-realtime-split/
```

## Step 8: Connect the prototype

In the page:

1. Paste Supabase Project URL.
2. Paste Supabase anon public key.
3. Keep Route ID as:

```text
demo-route-1
```

4. Click `Connect`.
5. Click `Save locally` if you want the page to remember the test config.

Expected:

- Status changes to `client created`.
- Event log shows `client-created`.

## Step 9: Test Broadcast GPS path

Use two tabs for the clearest test.

Tab A: Subscriber

1. Open the prototype.
2. Connect.
3. Click `Subscribe positions`.

Tab B: Driver broadcaster

1. Open the same prototype.
2. Connect.
3. Select `1 bus`.
4. Select `3 seconds`.
5. Click `Start broadcast`.

Expected in Tab A:

- `Messages received` increases.
- `Latest bus positions` updates.
- `Last latency` shows a millisecond value.

Repeat with:

- `2 buses`
- `4 buses`
- `5 seconds`

Important check:

```sql
select count(*) from public.stop_logs;
```

The count should not increase from GPS broadcasts. GPS is Broadcast only.

## Step 10: Test Postgres Changes path

In one tab:

1. Connect.
2. Click `Subscribe stop_logs`.
3. Click `Insert test stop_log via RPC`.

Expected:

- `Stop-log events` count increases.
- A new event appears in the stop-log table.
- Event log shows `stop-log-change`.

If the RPC button fails, use SQL Editor manually:

```sql
insert into public.stop_logs (route_id, bus_id, stop_id, boarded, alighted)
values ('demo-route-1', 'bus-1', 'stop-1', 1, 0);
```

The subscribed browser tab should still receive the Postgres Changes event.

## Step 11: Test reconnect behavior

Run these manual failure tests:

1. Start subscriber and broadcaster.
2. Turn Wi-Fi off for 10-20 seconds.
3. Turn Wi-Fi back on.
4. Watch event log for channel status changes.
5. Confirm positions resume without reloading.
6. Close subscriber tab, reopen, reconnect, subscribe again.
7. Confirm new broadcasts appear.

Capture:

- How long reconnect took.
- Whether manual resubscribe was needed.
- Whether latency spiked after reconnect.
- Whether any visible UI state was confusing.

## Step 12: Export evidence

After testing:

1. Click `Export JSON` in the prototype.
2. Save the downloaded file.
3. Summarize findings in:

```text
docs/spikes/2026-05-26-supabase-realtime-split.md
```

Record:

- bus count tested
- broadcast interval
- average/rough latency
- reconnect behavior
- stop_log event behavior
- whether GPS created DB rows
- final verdict: `VALIDATED`, `PARTIAL`, or `INVALIDATED`

## Cleanup after spike

Because these policies are intentionally permissive, either delete the test project or remove the spike objects:

```sql
drop function if exists public.spike_insert_stop_log(text, text, text, integer, integer);
drop table if exists public.stop_logs;
```

If keeping the project for later spikes, remove permissive policies before using it for auth/RLS validation.

## Production reminder

The production version must not use the permissive anon policies above.

Production should use:

- route-scoped Broadcast channels for GPS
- strict RLS for durable tables
- driver identity tied to Supabase Auth or another enforceable RLS-compatible pattern
- no service role key in frontend code
