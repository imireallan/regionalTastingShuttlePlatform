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

- Device/browser: local desktop browser test
- Supabase project: test project connected with browser-safe publishable/anon key
- Region: fake demo coordinates from shared sample route
- Network: local static server with Wi-Fi toggled offline/online
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

Desktop Supabase-connected observation from Allan:

- Event logs were exported from the 002 prototype.
- Reconnection after Wi-Fi offline/online toggle appeared almost immediate.
- Manual resubscription was only needed when the subscription tab itself was closed and a new tab was opened.
- Manual resubscription was not needed for normal offline/online toggling.
- While offline, the broadcaster-side event log kept streaming local broadcast/send events.
- During Wi-Fi toggling, sent message count became higher than received message count.
- The separate durable `stop_logs` Postgres Changes listener fired successfully when a stop log was inserted.

Interpretation:

- Reconnect behavior looks promising for desktop browser testing.
- The sent-vs-received mismatch during offline periods is expected for ephemeral Broadcast: messages emitted while the subscriber/network is unavailable should not be treated as durable queued events.
- Production UI should show stale/last-seen state and not imply every GPS ping is guaranteed delivery.
- This supports the architecture principle: GPS is live ephemeral state; stop logs remain the durable source of business truth.
- The core realtime split is working on desktop: Broadcast handles live positions, and Postgres Changes separately reports durable stop events.

No final production verdict yet. We still need the same test on target mobile/tablet network conditions.

## Decision

PARTIAL — DESKTOP REALTIME SPLIT VALIDATED; TABLET/MOBILE NETWORK BEHAVIOR STILL PENDING

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

- Real Supabase desktop Broadcast reconnect looks promising, but mobile/tablet network behavior is not yet tested.
- Real Supabase latency range/average has not yet been summarized from exported logs.
- RLS/private-channel design not yet tested.
- Browser/tab behavior on mobile network not yet tested.
- Production needs stale-position UI because Broadcast can drop messages while offline; sent count can exceed received count by design.
