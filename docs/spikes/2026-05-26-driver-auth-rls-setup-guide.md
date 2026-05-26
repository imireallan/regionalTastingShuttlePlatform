# Supabase Setup Guide for Spike 003: Driver Auth + RLS

Date: 2026-05-26

## Goal

Prove the MVP driver login pattern can be both simple for drivers and enforceable by Supabase RLS.

Default pattern under test:

- Driver UI: name + PIN.
- Implementation: one Supabase Auth user per driver.
- Internal email alias: `driver-name@regional-shuttle.internal`.
- PIN/password signs into Supabase Auth.
- RLS maps `auth.uid()` to `spike_drivers.auth_user_id`.

This avoids custom auth and prevents frontend-trust security holes.

## Step 1: Use a non-production Supabase project

Use the same spike project if you want, but keep this schema prefixed with `spike_`.

Never paste a service role key into a browser prototype.

## Step 2: Run the disposable schema

Open:

```text
Supabase Dashboard -> SQL Editor -> New query
```

Paste and run:

```text
prototypes/spikes/003-driver-auth-rls/schema.sql
```

This creates:

- `spike_routes`
- `spike_buses`
- `spike_drivers`
- `spike_driver_assignments`
- `spike_stop_logs`
- RLS policies
- `spike_my_driver_context` view

## Step 3: Create two Auth users

Open:

```text
Authentication -> Users -> Add user
```

Create Alice:

```text
Email: driver-alice@regional-shuttle.internal
Password: 1111testPIN!
Auto Confirm User: enabled if available
```

Create Bob:

```text
Email: driver-bob@regional-shuttle.internal
Password: 2222testPIN!
Auto Confirm User: enabled if available
```

Copy both user IDs from the Auth users table.

## Step 4: Insert seed data

Replace the two placeholder UUIDs below with the Auth user IDs copied from Supabase.

Run in SQL Editor:

```sql
with
route_insert as (
  insert into public.spike_routes (name)
  values ('Demo Tasting Loop')
  returning id
),
bus_a as (
  insert into public.spike_buses (label)
  values ('Bus A')
  returning id
),
bus_b as (
  insert into public.spike_buses (label)
  values ('Bus B')
  returning id
),
alice as (
  insert into public.spike_drivers (auth_user_id, display_name, internal_email)
  values ('PASTE_ALICE_AUTH_USER_ID_HERE', 'Alice Driver', 'driver-alice@regional-shuttle.internal')
  returning id
),
bob as (
  insert into public.spike_drivers (auth_user_id, display_name, internal_email)
  values ('PASTE_BOB_AUTH_USER_ID_HERE', 'Bob Driver', 'driver-bob@regional-shuttle.internal')
  returning id
)
insert into public.spike_driver_assignments (driver_id, bus_id, route_id)
select alice.id, bus_a.id, route_insert.id from alice, bus_a, route_insert
union all
select bob.id, bus_b.id, route_insert.id from bob, bus_b, route_insert;
```

Verify:

```sql
select
  d.display_name,
  d.auth_user_id,
  b.label as bus,
  r.name as route,
  a.service_date,
  a.active
from public.spike_driver_assignments a
join public.spike_drivers d on d.id = a.driver_id
join public.spike_buses b on b.id = a.bus_id
join public.spike_routes r on r.id = a.route_id
order by d.display_name;
```

Expected:

- Alice assigned to Bus A.
- Bob assigned to Bus B.

## Step 5: Get browser-safe API values

Open:

```text
Project Settings -> API Keys
```

Use:

- Project URL: `https://YOUR_PROJECT.supabase.co`
- Publishable key or legacy anon key

Do not use:

- service_role key
- secret key
- JWT secret

## Step 6: Test as Alice from browser console

Open any local spike page or a blank HTML page where Supabase JS is loaded. The 002 page is fine because it already loads Supabase JS.

In browser devtools console, run this after replacing URL/key:

```js
const client = supabase.createClient(
  'https://YOUR_PROJECT.supabase.co',
  'PASTE_PUBLISHABLE_OR_ANON_KEY'
)

await client.auth.signInWithPassword({
  email: 'driver-alice@regional-shuttle.internal',
  password: '1111testPIN!'
})

const context = await client
  .from('spike_my_driver_context')
  .select('*')

console.log('Alice context', context)
```

Expected:

- Alice sees one assignment.
- Assignment bus is Bus A.

## Step 7: Insert a valid Alice stop log

In the console, run:

```js
const { data: aliceContext } = await client
  .from('spike_my_driver_context')
  .select('*')
  .single()

const validInsert = await client
  .from('spike_stop_logs')
  .insert({
    route_id: aliceContext.route_id,
    bus_id: aliceContext.bus_id,
    stop_code: 'stop-1',
    boarded: 2,
    alighted: 0,
    created_by_driver_id: aliceContext.driver_id,
  })
  .select('*')

console.log('Valid Alice insert', validInsert)
```

Expected:

- Insert succeeds.
- Returned row belongs to Alice's route/bus.

## Step 8: Attempt cross-bus write as Alice

Find Bob's Bus B ID in SQL Editor:

```sql
select id, label from public.spike_buses order by label;
```

In browser console, replace `PASTE_BUS_B_ID` and run:

```js
const crossBusInsert = await client
  .from('spike_stop_logs')
  .insert({
    route_id: aliceContext.route_id,
    bus_id: 'PASTE_BUS_B_ID',
    stop_code: 'stop-bad-bus',
    boarded: 1,
    alighted: 0,
    created_by_driver_id: aliceContext.driver_id,
  })
  .select('*')

console.log('Cross-bus Alice insert should fail', crossBusInsert)
```

Expected:

- Insert fails.
- Error should be an RLS/policy violation or no row inserted.

## Step 9: Attempt driver impersonation as Alice

Find Bob's driver ID:

```sql
select id, display_name from public.spike_drivers order by display_name;
```

In browser console, replace `PASTE_BOB_DRIVER_ID` and run:

```js
const impersonationInsert = await client
  .from('spike_stop_logs')
  .insert({
    route_id: aliceContext.route_id,
    bus_id: aliceContext.bus_id,
    stop_code: 'stop-bad-driver',
    boarded: 1,
    alighted: 0,
    created_by_driver_id: 'PASTE_BOB_DRIVER_ID',
  })
  .select('*')

console.log('Alice impersonating Bob should fail', impersonationInsert)
```

Expected:

- Insert fails.
- Alice cannot write a row as Bob.

## Step 10: Deactivate Alice and retest

In SQL Editor:

```sql
update public.spike_drivers
set active = false
where internal_email = 'driver-alice@regional-shuttle.internal';
```

In browser console, try the valid insert again:

```js
const afterDeactivateInsert = await client
  .from('spike_stop_logs')
  .insert({
    route_id: aliceContext.route_id,
    bus_id: aliceContext.bus_id,
    stop_code: 'stop-after-deactivate',
    boarded: 1,
    alighted: 0,
    created_by_driver_id: aliceContext.driver_id,
  })
  .select('*')

console.log('Alice after deactivate should fail', afterDeactivateInsert)
```

Expected:

- Insert fails.

Restore Alice if continuing tests:

```sql
update public.spike_drivers
set active = true
where internal_email = 'driver-alice@regional-shuttle.internal';
```

## Step 11: Record verdict

Update:

```text
docs/spikes/2026-05-26-driver-auth-rls.md
```

Record:

- valid assigned insert result
- cross-bus insert result
- impersonation insert result
- deactivated-driver insert result
- whether the pattern is acceptable for MVP

## Production interpretation

If the tests pass, choose this V1 model:

- Admin creates driver Auth user behind the scenes.
- Driver sees only name + PIN.
- Login maps selected name to internal email alias.
- RLS uses `auth.uid()`, never trusted frontend identity alone.
- Admin reset PIN = update Supabase Auth password.
- Admin deactivate driver = set `drivers.active = false` and/or disable Auth user.

## Cleanup

To remove the spike schema:

```sql
drop table if exists public.spike_stop_logs cascade;
drop table if exists public.spike_driver_assignments cascade;
drop table if exists public.spike_buses cascade;
drop table if exists public.spike_routes cascade;
drop table if exists public.spike_drivers cascade;
drop view if exists public.spike_my_driver_context cascade;
```

You can also delete the two Auth users from the Dashboard.
