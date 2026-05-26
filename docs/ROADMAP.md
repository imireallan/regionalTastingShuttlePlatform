# Implementation Roadmap

Date: 2026-05-22

## Phase 0: Spikes and final architecture lock

Goal: Remove unknowns before production build.

Deliverables:
- Tile provider recommendation and map prototype.
- Supabase broadcast/Postgres Changes prototype.
- Driver auth decision and RLS sketch.
- Tablet wake-lock/kiosk go/no-go.
- IndexedDB queue approach.
- ETA formula.

Exit criteria:
- No blocker remains around web geolocation on driver tablet.
- Supabase remains viable as the only backend.
- Data model is final enough to create migrations.

## Phase 1: Project foundation

Deliverables:
- React + Vite PWA scaffold.
- Supabase project setup.
- Versioned migrations for core tables.
- Generated TypeScript DB types.
- Base layout and role routes: `/`, `/driver`, `/admin`.
- Environment config for dev/prod.

Exit criteria:
- App deploys to preview hosting.
- Supabase local/dev environment can run migrations.
- CI runs lint/type/test.

## Phase 2: Rider MVP

Deliverables:
- QR/deep-link landing.
- Daily code validation RPC.
- MapLibre route map.
- Stop list and active service status.
- Realtime bus marker subscription.
- Schedule-based ETA display.

Exit criteria:
- Rider can enter valid code and see live moving marker.
- Invalid/expired code blocks access.

## Phase 3: Driver MVP

Deliverables:
- Driver login.
- Assigned bus/route context.
- Geolocation permission flow.
- Wake lock integration.
- Position broadcast every 3-5 seconds.
- Arrived/boarded/alighted/confirm workflow.
- Light offline queue for stop taps.

Exit criteria:
- Driver can complete a simulated loop and produce trustworthy stop_logs.
- Tablet can run in kiosk configuration without sleeping.

## Phase 4: Admin MVP

Deliverables:
- Admin auth.
- CRUD routes/stops/buses/drivers.
- Generate daily code.
- Assign buses to routes.
- Live dashboard for buses and stop logs.
- Daily metrics and CSV export.

Exit criteria:
- Owner can operate daily service without developer access.

## Phase 5: Hardening and launch prep

Deliverables:
- RLS audit.
- E2E tests for rider/driver/admin critical paths.
- Tablet provisioning checklist.
- Support runbook.
- Backup/restore check.
- Production deployment.

Exit criteria:
- Launch checklist complete.
- Owner can run a rehearsal day.

## Phase 6: Post-MVP expansion

Only after V1 is stable:
- Secondary route.
- 4-bus support validation.
- More robust offline sync for dead zones.
- Better analytics.
- Route/stop import tools.
- Protomaps self-hosting if tile risk/cost justifies it.
