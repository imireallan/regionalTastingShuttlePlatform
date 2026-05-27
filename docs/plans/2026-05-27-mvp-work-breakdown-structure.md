# Regional Tasting Shuttle MVP: Work Breakdown Structure (WBS)

Date: 2026-05-27
Owner: Product/Engineering
Input: `docs/spikes/2026-05-27-final-spike-findings.md`

## 1) Scope boundary (what this WBS covers)

In scope (MVP live ops tool):
- Rider: QR/code entry, map, active shuttle marker, route stops, next-stop ETA, service status
- Driver: PIN session, permission preflight, live GPS broadcast, stop arrival + counts, short offline queue
- Admin/Owner: CRUD (routes/stops/buses/drivers), daily access codes, assignments, live ops view, stop logs, daily totals, CSV export

Out of scope (post-MVP):
- Payments/booking
- Native mobile apps
- Non-essential optimization/perf tuning beyond operational reliability

## 2) Delivery milestones

- M0: Field validation closeout (001/002/005/007 device checks)
- M1: Core platform skeleton + security baseline
- M2: Driver operations usable end-to-end
- M3: Rider live map + ETA usable end-to-end
- M4: Admin ops + reporting usable end-to-end
- M5: Hardening, UAT, launch readiness

## 3) WBS (phases -> work packages)

## Phase A — Field Validation Closeout (P0 gate)

A1. Tablet/Fully Kiosk runbook execution
- Execute integrated device session for spikes 001, 002, 005, 007
- Capture and archive logs/evidence
- Update spike docs from PARTIAL/PENDING to VALIDATED or PIVOT

A2. Launch gate decision
- Confirm go/no-go based on field evidence
- Freeze any architecture pivots before coding starts

Acceptance:
- All P0 spike blockers resolved with explicit decision

## Phase B — Foundation & Security

B1. Project scaffolding
- React + Vite PWA shell
- Supabase project wiring
- Environment/config pattern for frontend-safe keys only

B2. Data model + migrations (Supabase)
- Core tables: routes, stops, buses, drivers, assignments, stop_logs, daily_codes
- Constraints/indexes for operational queries

B3. RLS + RPC boundary
- Driver write/read policies bound to `auth.uid()` + active assignment
- Admin-only operations via RLS + narrow RPCs/views

B4. Auth flows
- Admin Supabase Auth login
- Driver auth user-per-driver alias + PIN/password flow

Acceptance:
- No service-role exposure in frontend
- Driver cannot write outside assignment
- Admin surface protected

## Phase C — Driver Surface (tablet-first)

C1. Driver session + preflight
- PIN-based login UX
- Permission gate (geolocation + denied-state recovery)

C2. Live location publisher
- 3-5s broadcast loop via Supabase Realtime Broadcast
- stale/offline state handling

C3. Stop operations UI
- Arrived/confirm workflow
- boarded/alighted counters

C4. Offline stop queue
- IndexedDB durable queue
- ordered replay + idempotency key
- sync state UI (queued/flushing/synced/failed)

Acceptance:
- Driver can complete a stop workflow online/offline without data loss
- Broadcast works while stop logs remain durable records

## Phase D — Rider Surface (mobile-first)

D1. Access flow
- QR/deep-link and code entry
- invalid code handling + service status messaging

D2. Live map experience
- MapLibre integration
- OpenFreeMap default style
- swappable tile provider config

D3. Live shuttle + stops
- route/stops rendering
- active shuttle marker from broadcast stream
- stale marker/last-seen handling

D4. ETA module integration
- schedule + observed-delay ETA engine
- confidence states and rider copy

Acceptance:
- Rider can enter, view live shuttle, and read ETA/service state clearly

## Phase E — Admin/Owner Surface

E1. Ops CRUD
- routes/stops/buses/drivers/assignments management

E2. Daily code operations
- code generation + validation workflow

E3. Live ops dashboard
- active buses and latest stop activity

E4. Reporting
- daily totals and CSV export

Acceptance:
- Admin can configure day operations without code changes
- daily operational outputs downloadable

## Phase F — Hardening, QA, Launch

F1. End-to-end scenario tests
- driver online
- driver short-offline/reconnect
- rider map + ETA
- admin close-of-day report

F2. Observability + runbooks
- error logging and key operational telemetry
- driver tablet SOP + permission recovery SOP

F3. Launch checklist
- config verification
- role access checks
- production deploy + smoke verification

Acceptance:
- Launch checklist complete with signoff

## 4) Dependency map (critical path)

A -> B -> C -> D/E -> F

Key strict dependencies:
- B2/B3 before C2/C4 (RLS + schema before driver writes)
- C2/C4 before D3 (rider depends on broadcast + stop-log truth)
- B2 before D4 (ETA needs stop schedule + confirmed log timestamps)
- C + D + E baseline complete before F1 end-to-end tests

## 5) Build order (thin vertical slices)

Slice 1 (security + minimum driver write):
- B2, B3, B4, C1, C3 (online only)

Slice 2 (driver reliability):
- C2, C4

Slice 3 (rider minimum viable):
- D1, D2, D3

Slice 4 (ETA + trust):
- D4 + rider copy states

Slice 5 (admin operations):
- E1, E2, E3, E4

Slice 6 (hardening/launch):
- F1, F2, F3

## 6) Work package sizing (execution-ready)

For each package, define before implementation:
- Deliverable artifact(s)
- Exact files/modules touched
- Test cases (happy + failure path)
- Done criteria
- Rollback/fallback note

## 7) Risks and mitigation in execution

- Device runtime drift vs desktop assumptions
  - Mitigation: keep tablet field test evidence as release gate

- Realtime instability in weak network
  - Mitigation: stale-state UX + broadcast/stop-log split + reconnect checks

- Operator confusion in denied permission states
  - Mitigation: mandatory preflight + explicit recovery copy + runbook

## 8) Definition of Done (MVP)

MVP is done only when:
- Driver can run a full shift workflow with short offline periods and no stop-log loss
- Rider can reliably access live map and ETA
- Admin can configure service day + export daily totals
- P0 field validations are closed with evidence
- Security guardrails (RLS, no service key in frontend) are verified

## 9) Immediate next 5 execution tasks

1. Execute integrated tablet field validation session (A1)
2. Lock any architecture pivots and sign off A2
3. Create schema + RLS migration set (B2/B3)
4. Implement driver preflight + auth session bootstrap (C1 + B4)
5. Implement stop-log write flow with idempotency-ready payload shape (C3 baseline)
