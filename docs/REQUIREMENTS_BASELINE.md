# Requirements Baseline

Date: 2026-05-26
Status: Synthesized from existing project docs and PDFs

Purpose: capture what is already set before writing the implementation plan. This is not a new scope document; it is a baseline summary of the current repo materials.

## Source documents reviewed

- `README.md`
- `docs/PRD.md`
- `docs/SDS.md`
- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/ROADMAP.md`
- `docs/RESEARCH_SPIKES.md`
- `docs/OPS.md`
- `docs/TDD.md`
- `docs/LOCAL_DEV.md`
- `docs/ADR.md`
- `docs/NOTES.md`
- `docs/PO_CALL_CLARIFICATION_QUESTIONS.md`
- `docs/SPIKE_RESEARCH_BRIEF_FOR_PO_CALL.md`
- `docs/SPIKE_GOOGLE_DOC_COMMENTS.md`
- `project-overview-extracted.txt`
- `Project Overview_ Regional Tasting Shuttle Platform-Allan.pdf`
- `Driver App_ High Level Overview-Allan.pdf`

## 1. Product direction already set

The MVP is a lightweight live shuttle operations tool.

It is explicitly not:

- a booking app
- a payment app
- a rider account system
- a native mobile app
- a complex dispatch optimizer
- a road-network ETA system

The app has three role-based surfaces.

### Rider

Anonymous, mobile-first shuttle passenger experience:

- QR/code access
- live shuttle map
- route stops
- next-stop ETA
- active/inactive/offline service state

### Driver

Tablet-first shuttle operations experience:

- Android tablet in Fully Kiosk Browser
- lightweight name/PIN or equivalent auth
- geolocation permission flow
- screen wake lock
- 3-5 second live position broadcast
- stop arrival logging
- boarded/alighted counts
- light offline queue for short connectivity drops

### Owner/Admin

Authenticated operational management surface:

- Supabase Auth email/password
- CRUD routes/stops/buses/drivers
- daily access code generation
- bus/route/driver assignment
- live operations view
- stop logs
- daily totals
- CSV export

The consistent product principles are:

- small footprint
- fast delivery
- low maintenance
- configurable data instead of hardcoded routes
- no custom backend unless a spike proves Supabase cannot support a required workflow

## 2. Stack already set

Locked or near-locked stack:

- Frontend: React + Vite PWA
- Backend/data/auth/realtime: Supabase
- Database: Supabase Postgres
- Security: Supabase RLS plus narrow RPCs/views
- Realtime GPS: Supabase Realtime Broadcast
- Durable operational events: Postgres `stop_logs`
- Map renderer: MapLibre GL JS
- Tile provider: OpenFreeMap first candidate; Protomaps or MapTiler pending spike
- Frontend hosting: Vercel or Netlify
- Driver runtime: Android tablet + Fully Kiosk Browser
- Package manager preference: pnpm
- Environments: dev and prod; avoid staging unless complexity justifies it

Open stack decision:

- Whether the app should use plain React + Vite SPA routing or React Router framework.
- Current documents ask the PO to confirm whether React Router framework is acceptable.

Pragmatic default:

- Use simple Vite + React Router client routing unless route loaders/actions or framework-level features become clearly useful.

## 3. Core architecture already set

The core design is the split between ephemeral GPS and durable operational records.

### Live GPS position

- Driver browser emits position every 3-5 seconds.
- Transport is Supabase Realtime Broadcast.
- Channel shape: `route:{route_id}:positions`
- Event: `bus_position`
- Payload includes:
  - `busId`
  - `routeId`
  - `lat`
  - `lng`
  - `heading`
  - `speed`
  - `accuracy`
  - `recordedAt`
- GPS pings are not inserted into Postgres.
- GPS is ephemeral UI state, not a permanent business record.

### Stop logs

- Stop arrivals and counts are persisted in Postgres.
- `stop_logs` is the durable source of truth for business metrics.
- Driver taps Arrived.
- A row is created even when boarded/alighted are both 0.
- Driver confirms counts.
- Admin dashboard can listen through Postgres Changes.

### Last-known position snapshot

Strongly recommended, though framed as optional in some docs:

- `bus_position_snapshots`
- one latest row per bus
- updated every 15-30 seconds or on meaningful movement
- avoids a blank rider/admin map before the next live broadcast arrives

## 4. Core entities already drafted

### `routes`

- `id`
- `name`
- `active`
- `service_window_start`
- `service_window_end`
- `created_at`

### `stops`

- `id`
- `route_id`
- `name`
- `sequence`
- `scheduled_time`
- `lat`
- `lng`
- `active`

### `buses`

- `id`
- `label`
- `route_id` nullable
- `status`: `in_service`, `off_service`, `offline`
- `driver_id` nullable
- `created_at`

### `drivers`

- `id`
- `name`
- `auth_user_id` nullable
- `pin_hash` nullable
- `active`

### `daily_codes`

- `id`
- `code`
- `valid_date`
- `route_id`
- `starts_at`
- `expires_at`
- `created_by`

### `stop_logs`

- `id`
- `bus_id`
- `stop_id`
- `route_id`
- `driver_id`
- `service_date`
- `arrived_at`
- `confirmed_at` nullable
- `boarded` default 0
- `alighted` default 0
- `notes` nullable
- `created_at`

### `bus_position_snapshots`

- `bus_id` primary key
- `route_id`
- `lat`
- `lng`
- `heading`
- `speed`
- `recorded_at`

Recommended additions before implementation:

- `admin_profiles` or `user_roles` for admin authorization.
- `driver_sessions` for start/end shift state and admin visibility.
- An assignment model if bus/driver/route assignments are date-specific.
- Database constraints:
  - `boarded >= 0`
  - `alighted >= 0`
  - unique route stop sequence
  - daily code unique per route/date
  - no accidental duplicate stop log for same bus/stop/service_date unless intentionally allowed

## 5. RLS posture already set

### Rider

- Anonymous.
- No direct table access by default.
- Uses `validate_daily_code` RPC.
- No insert/update/delete.

### Driver

- Lightweight authenticated user.
- Can read own driver record and assigned bus/route/stops.
- Can insert/update stop logs only for assigned bus/route.
- Can update own bus status.
- Cannot access admin metrics or other buses' private operational details.

### Admin

- Supabase Auth email/password.
- Full CRUD on operational tables.
- Can generate daily codes.
- Can read aggregate metrics.

Unresolved security/auth details:

- Exact driver auth pattern.
- Exact RLS implementation for driver PIN flow.
- How strictly rider broadcast channel access must be protected after daily code validation.
- Whether daily-code-gated anonymous access is good enough for low-risk MVP.

Current safest driver-auth default:

- Create a Supabase Auth user per driver.
- Hide generated email/internal auth details behind a simple name/PIN UI.
- Use `auth.uid()` in RLS.

## 6. RPC/API contract mostly set

Already documented RPC/service boundaries:

### `validate_daily_code(code)`

Purpose:

- Validate rider access.
- Return route, stops, service window, and realtime channel.

Failure response:

```json
{ "valid": false, "reason": "expired_or_invalid" }
```

### `generate_daily_code(route_id, valid_date)`

Purpose:

- Admin-only daily code generation.
- Returns code and expiry.

### `driver_login(driver_name, pin)`

Purpose:

- Proposed stable frontend contract.
- Final backend implementation depends on driver auth spike.

Frontend service wrappers should avoid scattering raw Supabase calls across components:

- `validateDailyCode(code)`
- `subscribeToRoutePositions(routeId, handler)`
- `broadcastBusPosition(position)`
- `createStopArrival(input)`
- `confirmStopLog(logId, counts)`
- `generateDailyCode(routeId, date)`
- `listDailyMetrics(date)`

Recommended implementation adjustment:

Use RPCs for driver stop workflows too:

- `start_driver_session`
- `end_driver_session`
- `record_stop_arrival`
- `confirm_stop_log`
- `upsert_bus_position_snapshot`
- `get_admin_daily_metrics`

Reason:

- central validation
- simpler idempotency/dedupe
- safer offline replay
- narrower frontend permissions

## 7. ETA approach already set

V1 ETA is schedule-based, not road-network based.

Formula:

```text
observed_delay = actual_arrival_at_latest_stop - scheduled_time_for_latest_stop
next_stop_eta = scheduled_time_for_next_stop + observed_delay
eta_minutes = next_stop_eta - now
```

Rules:

- If no prior stop event exists, use raw schedule.
- If bus is ahead of schedule, show early/on-time wording rather than negative minutes.
- If stop is skipped or forgotten, infer from later stop in V1; explicit skipped state can be future work.
- If multiple buses serve the same route, compute ETA per bus and let rider UI show nearest/next arrival.

Still needs clarification:

- Whether the actual service has a fixed timetable.
- Whether the schedule is strict or approximate.
- Whether rider-facing ETA should be exact minutes, ranges, or friendlier language.

## 8. Offline strategy already set at high level

V1 offline support is deliberately minimal.

Stop events:

- Persist to IndexedDB during short connectivity drops.
- Replay in order.
- Do not silently lose stop taps or counts.
- Show driver-visible status.

GPS:

- Do not replay stale GPS pings as if current.
- Keep latest unsent/current position only, ideally with a TTL.
- Live GPS can disappear temporarily; operational records matter more.

Flush triggers:

- app start
- network returns
- Supabase reconnects
- driver performs next action
- periodic timer while app is open

Still needs spike:

- idempotency strategy for queued stop logs
- duplicate prevention
- visible queue/sync/failure states

## 9. Map behavior partially set

Already set:

- MapLibre renders maps.
- Tile provider must be production-safe.
- Do not use `tile.openstreetmap.org` for production traffic.
- OpenFreeMap is first provider to test.
- Protomaps and MapTiler are fallbacks/alternatives.
- Map configuration should be isolated in one module, not scattered through components.
- Route/stops/buses are configurable data.

Still unclear:

- target region
- actual stop coordinates
- whether route polyline geometry exists
- whether riders should see all buses or only next/nearest bus
- exact map fallback if no bus is broadcasting

Pragmatic default:

- Show stops and live bus markers.
- Skip route polyline unless geometry is provided.
- Show all active buses for the authorized route.
- Use last-known snapshot when available.
- Otherwise show “Waiting for shuttle location.”

## 10. Launch assumptions already set

From the source project overview:

- Launch starts with two buses on one shared primary loop.
- Expansion target is about four buses and a secondary route in 6-12 months.
- Manual shuttle operations may start before the app is live.
- Tracking app was expected in a 4-6 week build window from the original brief date.
- V1 scale is tiny: 2-4 buses.

Implementation implication:

- Design schema for multiple routes and buses now.
- Build/test the first UI around one primary loop and two buses.
- Do not overbuild multi-tenant SaaS, dispatch optimization, booking, or robust offline sync.

## 11. Roadmap already defined

### Phase 0: Spikes and architecture lock

- tile provider
- realtime broadcast
- driver auth
- tablet wake/kiosk reliability
- IndexedDB queue
- ETA formula

### Phase 1: Foundation

- React/Vite PWA
- Supabase setup
- migrations
- generated TypeScript DB types
- role routes
- environment config
- CI

### Phase 2: Rider MVP

- QR/deep link
- daily code validation
- MapLibre map
- stop list/status
- realtime marker
- ETA

### Phase 3: Driver MVP

- login
- assigned bus/route
- geolocation
- wake lock
- position broadcast
- stop logging
- offline queue

### Phase 4: Admin MVP

- auth
- CRUD
- daily codes
- assignments
- live dashboard
- metrics
- CSV export

### Phase 5: Hardening and launch

- RLS audit
- E2E tests
- tablet checklist
- support runbook
- backup/restore check
- production deployment

### Phase 6: Post-MVP

- secondary route
- 4-bus validation
- robust offline sync
- better analytics
- route import tools
- Protomaps self-hosting if justified

## 12. Biggest unresolved requirements

### Route/service facts

- exact target region/city
- exact stop list
- stop addresses/coordinates
- service days
- service hours
- loop duration
- dwell time
- fixed timetable vs flexible loop
- dead zones/low-signal areas

### Driver operations

- exact tablet model
- whether tablets are mounted and charging
- who provisions tablets
- whether tablets are assigned to buses
- whether drivers are assigned to buses
- number of drivers at launch
- whether name + PIN is a hard requirement
- who resets PINs

### Security/auth

- final driver auth implementation
- rider broadcast channel protection expectation
- whether daily-code security is sufficient for low-risk MVP
- whether one admin account is enough

### Admin workflow

- manual vs automatic code generation
- whether code revocation is needed
- correction/backfill for wrong or missed stop logs
- exact CSV columns
- whether admin CRUD needs polished UI at launch or can start basic

### Rider UX

- whether QR includes code or requires manual entry
- whether validated access is stored locally for the day
- show all buses vs next/nearest bus
- invalid/expired support text
- map fallback when no live position exists

## 13. Note from Driver App high-level overview PDF

The Driver App PDF is sparse but adds a few conceptual UI signals:

- Rider column: daily rotating code, code entry, live ride map, pass list.
- Driver column: identity-first, name + PIN on tablet, suitable for shared-device environment, sign-in → job queue → end-of-day summary.
- Owner column: email/password, analytics layer, metric cards, revenue chart, driver roster.

Potential conflicts or scope risks:

- Current MVP docs focus admin metrics on ridership and stop logs, not revenue.
- Current driver docs describe route/stop console, not a generic job queue/end-of-day workflow.
- “Pass list” may imply offers/passes, but that is not in the current PRD.

Recommendation:

- Treat the Driver App PDF as early conceptual UI, not binding MVP scope, unless the product owner confirms pass list, job queue, revenue chart, or end-of-day summary as launch requirements.

## 14. Confidence after document review

- Architecture: high confidence.
- MVP scope: high confidence.
- Supabase contracts: medium-high confidence.
- Rider/admin flows: medium-high confidence.
- Driver flow: medium confidence because tablet/auth/operations still need answers.
- ETA UX: medium confidence until the actual service schedule is confirmed.

## 15. Recommended next step

Before writing the bite-sized implementation plan, do a targeted clarification pass around:

1. actual route/stops/schedule/connectivity
2. tablet model and provisioning ownership
3. driver auth and assignment reality
4. rider map behavior defaults
5. admin correction/export expectations

Then write the implementation plan with small tasks covering:

- Supabase schema and migrations
- RLS and RPCs
- realtime channel wrappers
- rider flow
- driver flow
- admin flow
- map configuration
- offline queue
- tests and verification
