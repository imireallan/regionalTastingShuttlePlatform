# Architecture Decision Records

Date: 2026-05-22

## ADR-001: Use Supabase as backend platform

Status: Proposed / pending spikes

Decision:
Use Supabase for Postgres, Auth, RLS, Realtime Broadcast, and Postgres Changes.

Rationale:
- Collapses backend, realtime, auth, and DB into one managed service.
- Fits low-maintenance constraint.
- RLS can enforce role boundaries without a custom API server.

Risks:
- Driver auth pattern needs validation.
- Realtime reconnect behavior needs validation.

## ADR-002: Use React + Vite PWA, no native apps

Status: Accepted

Decision:
Build one web PWA with role routes.

Rationale:
- No app store review.
- One codebase.
- Works for anonymous riders and tablet drivers.

Risks:
- Browser geolocation reliability on Android tablet is the highest technical risk.

## ADR-003: Use MapLibre GL JS

Status: Accepted

Decision:
Use MapLibre for map rendering.

Rationale:
- Open-source.
- No per-load renderer billing.
- Works with multiple tile providers.

Risks:
- Tile provider must be selected carefully; do not use raw OSM production tiles.

## ADR-004: Do not persist every GPS ping

Status: Accepted

Decision:
Use Supabase Realtime Broadcast for live positions and persist only stop logs plus optional last-known-position snapshot.

Rationale:
- GPS pings are high-frequency UI state.
- Stop logs are business facts.
- Avoids unnecessary DB growth and write load.

## ADR-005: Model ridership as flow events, not running occupancy

Status: Accepted

Decision:
Store boarded/alighted per stop log. Treat live occupancy as approximate UI state only.

Rationale:
- One missed tap damages one row, not the entire day.
- Metrics become simple GROUP BY queries.
- Zero-movement stops are still trustworthy operational facts.

## ADR-006: Use config data for routes/stops/buses

Status: Accepted

Decision:
Routes, stops, buses, and assignments are database rows, not code constants.

Rationale:
- Supports 2 to 4 buses and secondary route without redeploy.
- Admin can operate the service without developer support.
