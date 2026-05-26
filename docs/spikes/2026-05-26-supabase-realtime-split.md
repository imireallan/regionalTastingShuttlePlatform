# Spike: Supabase Realtime Split

## Question

Can Supabase Realtime Broadcast handle ephemeral GPS positions while Postgres Changes handles durable `stop_logs` updates for rider/admin live operations?

## Why this matters

The MVP architecture depends on splitting high-frequency, disposable GPS state from durable business records. If this fails, we either write too much GPS data to Postgres, add a custom realtime backend, or change the live map freshness expectation.

## Prototype

Created standalone browser prototype:

```text
prototypes/spikes/002-supabase-realtime-split/index.html
```

It includes:

- Supabase URL + anon key connection form.
- Driver broadcaster that emits fake positions for 1, 2, or 4 buses every 3 or 5 seconds.
- Rider/admin subscriber that listens on `route:{route_id}:positions`.
- Per-bus latest position table.
- Latency measurement from `sent_at` to receive time.
- Stop-log listener using `postgres_changes` on `public.stop_logs`.
- Optional test insert button using RPC `spike_insert_stop_log`.
- Exportable JSON event logs.

## Test setup

- Device/browser: local desktop static smoke test so far
- Supabase project: not connected yet
- Region: fake demo coordinates from shared sample route
- Network: local static server
- Test data: fake moving bus payloads generated in browser

## Pressure tests

Real validation still needs a non-production Supabase project.

Planned tests:

- Happy path:
  - Connect with anon key.
  - Subscribe rider/admin tab.
  - Start driver broadcast with 1 bus.
  - Repeat with 2 and 4 buses.
  - Confirm latency stays acceptable for rider UX.
- Failure path:
  - Kill/restart network.
  - Close/reopen subscriber tab.
  - Confirm channel status and recovery behavior in event log.
- Durable stop-log path:
  - Enable Realtime publication for `public.stop_logs`.
  - Insert test stop log via RPC or SQL editor.
  - Confirm Postgres Changes event appears separately from GPS broadcast.
- Architecture check:
  - Confirm GPS broadcasts do not create database rows.

## Findings

Prototype implementation and static smoke test passed:

```text
http://localhost:4173/002-supabase-realtime-split/
HTTP 200
prototype 002 smoke test passed
```

The prototype is ready for real Supabase validation, but no production decision can be made until connected to a test Supabase project.

## Decision

PENDING REAL SUPABASE TEST

## Recommendation

Use this as the Phase 0 realtime validation harness. Run it against a non-production Supabase project with anon key only.

If validated, production should use:

- Supabase Broadcast channel `route:{route_id}:positions` for ephemeral GPS.
- Postgres `stop_logs` + Realtime Postgres Changes for durable stop events.
- Optional low-frequency `bus_position_snapshots` table for initial map load / last-known-position.

## Implementation impact

Likely production modules affected:

- `src/realtime/positionBroadcast.ts`
- `src/realtime/stopLogSubscription.ts`
- `src/features/driver/locationPublisher.ts`
- `src/features/rider/liveBusStore.ts`
- Supabase publication config for `stop_logs`
- Possible `bus_position_snapshots` table/RPC if initial map blank state is unacceptable

## Risks remaining

- Reconnect behavior not yet measured.
- Real Supabase latency not yet measured.
- RLS/private-channel design not yet tested.
- Postgres Changes setup depends on Supabase publication/RLS policy configuration.
- Browser/tab behavior on mobile network not yet tested.
