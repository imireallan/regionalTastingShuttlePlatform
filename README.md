# Regional Tasting Shuttle Platform

Lightweight web platform for a regional tasting shuttle service.

The product has three role-based surfaces:
- Rider: anonymous QR/code access to live shuttle map and next-stop ETA.
- Driver: tablet-first stop arrival logging, passenger on/off counts, and live position broadcast.
- Owner/Admin: daily code generation, fleet/route assignment, live operations view, and business-health metrics.

Core stance: small footprint, fast delivery, low maintenance.

## Locked stack

- Frontend: React + Vite PWA
- Backend/data/realtime/auth: Supabase
- Maps: MapLibre GL JS
- Tiles: OpenFreeMap by default; Protomaps or MapTiler to be decided by spike
- Hosting: Vercel or Netlify for frontend; Supabase managed project
- Driver tablet runtime: Android tablet + Fully Kiosk Browser

## Documentation map

- `docs/PRD.md` — product requirements, personas, scope, acceptance criteria
- `docs/SDS.md` — system design, data model, RLS posture, realtime flows
- `docs/ARCHITECTURE.md` — diagrams and state/data flows
- `docs/API.md` — Supabase RPC/events/client contracts
- `docs/RESEARCH_SPIKES.md` — technical spikes required before production build
- `docs/SPIKE_RESEARCH_BRIEF_FOR_PO_CALL.md` — comment-ready research brief for product owner review
- `docs/SPIKE_GOOGLE_DOC_COMMENTS.md` — reusable Google Doc comment prompts for spike review
- `docs/PO_CALL_CLARIFICATION_QUESTIONS.md` — first-person clarification questions for the product owner call
- `docs/ROADMAP.md` — phased implementation plan
- `docs/LOCAL_DEV.md` — local setup and developer workflow
- `docs/TDD.md` — testing strategy and acceptance test matrix
- `docs/OPS.md` — deployment, monitoring, backups, support runbook
- `docs/ADR.md` — architecture decision records
- `docs/NOTES.md` — running clarifying questions, answers, and implementation impact

## MVP definition

MVP is not a booking app. MVP is a reliable live shuttle operations tool:
1. Rider can enter a valid daily code and see active shuttle location, stops, and ETA.
2. Driver can run a kiosk-safe tablet session for a full shift and log stop events.
3. Owner can configure routes/stops/buses/drivers, generate daily codes, and see daily operating metrics.

Out of scope for V1: rider accounts, payments, booking integration, native mobile apps, road-network routing ETA, robust dead-zone offline sync.
