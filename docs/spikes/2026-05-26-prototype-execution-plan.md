# Research Spike Prototype Execution Plan

Date: 2026-05-26

## Goal

Create throwaway, observable prototypes that answer the riskiest Regional Tasting Shuttle MVP assumptions before production implementation starts.

## Non-negotiables

- Keep prototypes isolated from production code.
- No production traffic against `tile.openstreetmap.org`.
- Do not persist every GPS ping.
- Do not expose Supabase service role keys in frontend/browser code.
- Every spike ends with a written verdict: `VALIDATED`, `PARTIAL`, or `INVALIDATED`.
- Prototype code can be ugly. The decision evidence cannot be vague.

## Prototype workspace

Use this structure:

```text
prototypes/
  spikes/
    001-wakelock-kiosk/
    002-supabase-realtime-split/
    003-driver-auth-rls/
    004-indexeddb-buffer-flush/
    005-map-tiles/
    006-schedule-eta/
    007-pwa-permissions/
docs/
  spikes/
    YYYY-MM-DD-[spike-name].md
```

Each prototype directory should include:

- `README.md` with question, setup, commands, findings, and verdict.
- Minimal runnable code.
- No production abstraction unless it directly proves the risk.

## Execution order

The order is risk-first, not convenience-first.

| # | Spike | Kill question | Prototype output | Decision produced |
|---|---|---|---|---|
| 001 | Wake Lock + Fully Kiosk | If Android/Fully Kiosk cannot keep screen, GPS, and timers active over a realistic shift, web-only driver tracking is unsafe. | HTTPS driver tracking page showing geolocation samples, wake lock state, timer drift, network state, and exportable logs. | Go/no-go for web-only driver tracking; tablet/Fully Kiosk runbook requirements. |
| 002 | Supabase Realtime split | If Broadcast reconnect/latency is poor for 2-4 buses, realtime architecture must change. | Two-tab prototype: fake driver broadcaster + rider/admin subscriber with moving marker and latency display; stop-log listener separately. | Confirm Broadcast for GPS, Postgres Changes for stop logs, and need for last-known snapshot table. |
| 003 | Driver auth + RLS | If driver PIN flow cannot enforce RLS without frontend trust, auth model must change. | SQL policies + small client/RPC test proving driver can only write assigned bus/route logs. | Final driver auth pattern: auth user alias vs anonymous/custom claim vs RPC/token. |
| 004 | IndexedDB buffer/flush | If stop taps are lost/reordered during short offline periods, driver operations are unsafe. | Browser page with Arrived/Confirm/counters, offline simulation, durable queue, refresh survival, flush state. | Minimal offline queue behavior and idempotency-key requirement. |
| 005 | Map tiles | If target region loads poorly or provider risk is unacceptable, tile provider must change. | MapLibre page with OpenFreeMap first, sample stops, moving bus marker, and provider-swappable config. | V1 tile provider and fallback path. |
| 006 | Schedule ETA | If schedule + observed delay produces confusing ETA across edge cases, ETA scope must change. | Pure TypeScript function + fixture tests for loop/early/late/skipped/no-log scenarios. | Locked V1 ETA formula and rider wording. |
| 007 | PWA permissions | If onboarding/permission recovery is confusing, UX/runbook must change. | Mobile-first pages for rider QR/code and driver permission states; manual device test notes. | PWA install stance and permission recovery copy/runbook. |

## Phase 1: Create common spike harness

Objective: create enough shared scaffolding to avoid repeating boring setup while keeping prototypes disposable.

Tasks:

1. Create `prototypes/spikes/` directories.
2. Add a root `prototypes/README.md` explaining how to run each prototype.
3. Add shared `prototypes/spikes/_shared/` only for generic helpers:
   - sample route/stops
   - fake bus movement generator
   - report template
4. Avoid building a full app shell. Each spike should run independently.

Recommended stack for prototypes:

- Vite + React + TypeScript where browser/device interaction is needed.
- Plain TypeScript/Vitest for pure ETA logic.
- Supabase JS client only where testing Supabase behavior.
- SQL files for RLS/auth spike.

## Phase 2: Build the first three high-risk prototypes

### 001 — Wake Lock + Fully Kiosk

Build first because it can kill the whole driver web-tracking approach.

Minimum UI:

- Start/Stop tracking buttons.
- Geolocation permission state.
- Wake Lock API state.
- Last known latitude/longitude/accuracy/timestamp.
- Broadcast/send interval counter every 3-5 seconds.
- Timer drift measurement.
- Network online/offline indicator.
- Log table with export/copy JSON button.

Verification:

- Local browser sanity test.
- Hosted HTTPS test, because geolocation/wake lock require secure context.
- Actual Android/Fully Kiosk test when tablet is available.

### 002 — Supabase Realtime split

Build second because it validates the core live ops architecture.

Minimum UI:

- Driver tab: choose bus count 1/2/4, start broadcasting fake route positions every 3 seconds.
- Rider/admin tab: subscribe to route channel, render latest position and latency per bus.
- Stop log panel: insert one durable stop log and observe separate Postgres Changes subscription.

Verification:

- Confirm GPS broadcasts do not write to Postgres.
- Confirm reconnect behavior after network/browser interruption.
- Record latency range and failure behavior.

### 003 — Driver auth + RLS

Build third because security shape affects schema and admin flows.

Minimum output:

- SQL schema stub for drivers, buses, assignments, stop_logs.
- RLS policy variants.
- Test script or Supabase SQL checks proving:
  - driver can insert/update only assigned bus stop logs
  - driver cannot write another bus
  - admin can reset/deactivate driver

Recommendation bias:

- Start with Supabase Auth user per driver using internal alias + PIN/password unless anonymous/custom-claim path proves materially cleaner without weakening RLS.

## Phase 3: Build operational resilience prototypes

### 004 — IndexedDB buffer/flush

Minimum UI:

- Arrived button.
- Boarded/alighted counters.
- Confirm button.
- Queue status: queued, flushing, synced, failed.
- Offline toggle for simulation.
- Refresh-survival test.

Verification:

- Queue stop events offline.
- Refresh before reconnecting.
- Reconnect and flush in order.
- Duplicate-tap/idempotency behavior documented.
- GPS stale replay explicitly prevented.

### 005 — Map tiles

Minimum UI:

- MapLibre map centered on target region.
- Sample route stops.
- Moving bus marker.
- Provider config file with OpenFreeMap default.

Verification:

- No `tile.openstreetmap.org` usage.
- Mobile load behavior documented.
- Cost/license/fallback notes captured.

## Phase 4: Build low-code decision prototypes

### 006 — Schedule ETA

Minimum output:

- `calculateEta()` pure TypeScript function.
- Fixtures covering:
  - no prior stop log
  - late bus
  - early bus
  - final stop
  - loop rollover
  - skipped stop
  - multiple buses
  - service ended
  - out-of-order logs
  - missing confirmation

Verification:

- Vitest passing.
- README explains rider wording rules.

### 007 — PWA permissions UX

Minimum output:

- Rider QR/code flow mock.
- Driver permission preflight mock.
- Denied geolocation recovery state.
- Install guidance copy only where useful.

Verification:

- iOS Safari notes.
- Android Chrome notes.
- Fully Kiosk notes.

## Definition of done for each spike

A spike is done only when all are true:

1. Prototype runs with documented command.
2. Happy path tested.
3. Failure path tested or explicitly blocked by missing hardware/account.
4. Findings are concrete: latency, behavior, logs, screenshots/manual observations, or test output.
5. `docs/spikes/YYYY-MM-DD-[spike-name].md` exists.
6. Recommendation clearly says what production should do next.
7. Implementation impact is listed: schema, RLS, frontend modules, ops runbook, or scope change.

## Immediate next step

Start with Phase 1 scaffolding, then build `001-wakelock-kiosk` as the first prototype.

Reason: tablet/kiosk reliability is the highest-risk assumption. If it fails, we need to pivot before spending time on polished realtime/map implementation.
