# Project Notes

Purpose: capture project-specific clarifying questions and answers that explain terms, decisions, or requirements.

Rule: only add substantive project clarifications, for example questions like "what do we mean by ephemeral broadcast only?" with the answer shared. Do not add meta/process questions about how to maintain this file.

## Clarifying Questions and Answers

### 2026-05-22 — Ephemeral broadcast only

Question: What do we mean by "ephemeral broadcast only"?

Answer: "Ephemeral broadcast only" means the live GPS position is sent in real time to connected clients, but it is not saved as a permanent database record.

In this project:

Driver tablet:
- Gets current GPS position every 3–5 seconds.
- Sends it through Supabase Realtime Broadcast.
- Riders/admins subscribed to that route receive the latest position.
- The bus marker moves on the map.

But:
- We do not insert every GPS ping into Postgres.
- We do not build a historical GPS trail in V1.
- If nobody is listening, that position update is effectively gone.
- If a rider opens the app after a broadcast happened, they do not receive old broadcasts automatically.

Think of it like a live radio signal:
- If you are tuned in, you hear it.
- If you tune in later, you do not hear what was already said.

Why this is the right default here:
- GPS pings every 3–5 seconds create lots of noisy writes.
- The business does not need exact historical GPS traces for V1.
- Riders only care where the shuttle is now.
- Admin metrics should come from stop events, not raw GPS trails.
- Keeps Supabase/Postgres small, cheap, and low-maintenance.

What we do persist instead:

1. Stop logs
   - Driver arrived at Stop A.
   - 3 boarded.
   - 1 alighted.
   - timestamp.
   - These are business facts and go into Postgres.

2. Optional last-known position snapshot
   - One row per bus.
   - Updated every 15–30 seconds, or when meaningful.
   - Used so a rider/admin opening the map does not see a blank screen before the next live GPS broadcast.

Implementation impact:
- Live position flow is Driver → Supabase Realtime Broadcast → Rider/Admin map.
- Live GPS positions are not stored permanently.
- `stop_logs` remains the permanent source of operational truth.
- Optional `bus_position_snapshots` can store the latest known position only, overwritten per bus.
- The model is: Broadcast = "where is the bus right now?"; stop_logs = "what actually happened today?"; snapshot = "what was the last known bus position when I opened the app?"


### 2026-05-22 — RPC and Supabase RPCs

Question: Explain the RPC technology in itself and also Supabase RPCs. How, why, and when should we use them, with examples from this project?

Answer: RPC means Remote Procedure Call. Instead of the client calling a generic REST endpoint like `POST /api/codes/validate`, the client calls a named function that lives on a remote system, for example `validate_daily_code(code)`. The call feels like invoking a local function from the frontend, but the actual logic executes remotely near the data.

In general technology terms:
- Procedure = a function or operation with a clear name.
- Remote = it runs somewhere else, usually a server or database.
- Call = the client sends inputs and receives a return value.

In Supabase, an RPC is usually a Postgres function exposed through Supabase's API layer. The frontend calls it with `supabase.rpc('function_name', params)`. The function runs inside Postgres, can read/write tables subject to permissions and function security settings, and returns structured data.

Why use RPCs:
- To keep sensitive logic close to the database.
- To avoid exposing raw table access for workflows that need validation.
- To perform multi-step operations atomically.
- To return purpose-built response shapes to the frontend.
- To centralize business rules that multiple UI screens might use.

When to use RPCs in this project:
- Use RPC when the client needs a controlled operation, not broad table access.
- Use RPC when the operation spans multiple tables.
- Use RPC when validation/security matters.
- Use RPC when the frontend should not know the internal query details.
- Do not use RPC for every simple CRUD action if RLS-protected table access is enough.

Project examples:

1. `validate_daily_code(code)`
- Rider enters a daily code.
- Frontend calls a Supabase RPC.
- The function checks `daily_codes`, date, service window, route status, and expiration.
- It returns only the route/stops/channel information the rider is allowed to see.
- This avoids giving anonymous riders direct table access to all `daily_codes`, `routes`, or `stops`.

2. `generate_daily_code(route_id, valid_date)`
- Admin clicks generate code.
- RPC creates a unique code, sets start/end validity, inserts the row, and returns the code.
- This prevents duplicated code-generation logic in the frontend.
- This also keeps the format/expiry rules centralized.

3. `driver_login(driver_name, pin)` or equivalent auth helper
- Driver enters name + 4-digit PIN.
- RPC can verify the driver record and return assigned bus/route context.
- The final implementation depends on the driver-auth spike, but the API boundary can stay stable.

4. `get_admin_daily_metrics(service_date)`
- Admin dashboard needs daily totals.
- RPC can aggregate `stop_logs` by route, bus, stop, and time bucket.
- Frontend receives clean metrics instead of duplicating SQL-like aggregation logic.

5. `record_stop_arrival(...)` may or may not be an RPC
- If normal RLS insert is simple enough, driver can insert into `stop_logs` directly.
- If arrival needs validation, deduping, sequence checks, or auto-derived fields, use an RPC.

Implementation impact:
- Use Supabase RPCs for controlled business workflows, especially rider code validation, daily code generation, auth-adjacent driver flows, and admin metrics.
- Keep simple RLS-protected CRUD as direct table operations where safe.
- Do not build a separate FastAPI/Node backend just to wrap Supabase unless a spike proves Supabase RPC/RLS cannot support the requirement.
- Frontend should wrap RPC calls in service functions like `validateDailyCode(code)` instead of calling `supabase.rpc(...)` directly in components.


### 2026-05-22 — MapLibre, OpenFreeMap, Protomaps, and MapTiler

Question: What are MapLibre, OpenFreeMap, self-hosted Protomaps, and MapTiler? Which one is mandatory in this project and how are they connected?

Answer: MapLibre is the frontend map rendering library. It runs in the browser and draws the interactive map, markers, routes, labels, zoom/pan behavior, and styling. MapLibre does not provide the actual map data/tiles by itself.

OpenFreeMap, Protomaps, and MapTiler are tile/data providers. They provide the map tiles that MapLibre renders.

Relationship:
- MapLibre = renderer/client library.
- Tile provider = source of map imagery/vector data.
- Map style = JSON configuration that tells MapLibre which tile source to load and how to draw roads, land, labels, water, etc.

Project decision:
- Mandatory: MapLibre or an equivalent browser map renderer. The current architecture has selected MapLibre.
- Mandatory: some production-safe tile provider.
- Not mandatory: OpenFreeMap specifically.
- Not mandatory: Protomaps specifically.
- Not mandatory: MapTiler specifically.

Important rule:
- Do not use raw `tile.openstreetmap.org` for production embedding. It is not intended for this app's production tile traffic.

Recommended V1 stance:
- Use MapLibre as the renderer.
- Start with OpenFreeMap if the tile spike confirms it works reliably for the target region and expected traffic.
- Keep Protomaps as the best control/low-risk long-term option if we want self-hosted tiles.
- Use MapTiler if we prefer paid hosted reliability/support and the cost is acceptable.

Implementation impact:
- The rider/admin map code should be written against MapLibre, not against a specific tile vendor.
- Tile provider configuration should be isolated in one map config file so OpenFreeMap, Protomaps, or MapTiler can be swapped without rewriting app features.
- The Phase 0 tile spike must choose the production tile provider before launch.


### 2026-05-22 — Meaning of spike

Question: What do we mean by “spike” in this context?

Answer: A spike is a short, time-boxed research/prototype task used to reduce uncertainty before committing to full implementation. It is not production feature work. The goal is to answer a specific technical or product risk question with evidence.

In this shuttle project, a spike means: test the risky assumption quickly, document the finding, make a recommendation, then decide whether to proceed, change approach, or de-scope.

Examples:
- Tile provider spike: prove MapLibre can render the target region using OpenFreeMap/Protomaps/MapTiler and recommend one.
- Supabase Realtime spike: prove one browser can emit bus positions and another can receive live marker updates reliably.
- Tablet spike: prove an Android tablet in Fully Kiosk can keep screen/GPS active across a full shift.
- Offline queue spike: prove stop taps are saved locally and flushed in order after reconnection.

A good spike has:
- One clear question.
- A small prototype or test.
- A time box.
- Findings.
- Recommendation.
- Decision impact.

Implementation impact:
- Phase 0 is spike work, not full production build.
- Spike code can be throwaway unless useful enough to promote.
- The output should be written in `docs/spikes/YYYY-MM-DD-spike-name.md`.
- Production implementation should only start once the high-risk spikes have clear recommendations.


### 2026-05-22 — What to say before spikes are tested

Question: Since I have not actually tested the spikes, what can be mentioned in the product owner call?

Answer: Be explicit that the current material is an engineering hypothesis and risk assessment, not validated spike results. In the call, present the proposed architecture, the reasoning behind it, the known risks, and the exact validation plan. Do not claim that OpenFreeMap, Supabase Realtime, Fully Kiosk, IndexedDB offline queue, or schedule-based ETA have been proven for the actual route/devices yet.

Safe phrasing:
- “Based on the brief and docs, this is the recommended architecture.”
- “These are the assumptions we need to validate before full production build.”
- “The highest-risk assumption is the driver tablet: geolocation + screen wake + kiosk mode over a full shift.”
- “I recommend a short Phase 0 spike round before implementation.”
- “The outcome of Phase 0 should be go/no-go decisions or architecture adjustments.”

Avoid saying:
- “This definitely works.”
- “Supabase Realtime is proven for our exact use case.”
- “Fully Kiosk will keep GPS alive all day.”
- “OpenFreeMap is the final tile provider.”
- “Offline sync is solved.”

Implementation impact:
- The PO call should align on assumptions, risks, acceptance criteria, and business constraints.
- Spike results should be documented only after actual prototypes/tests are run.
- The research brief should be treated as pre-spike preparation, not final technical validation.

### 2026-05-26 — Rider QR code generation and scan point

Question: Who generates rider QR codes, how are they generated, and when/where do riders scan them?

Answer: The recommended MVP model is that the owner/admin generates rider QR access from the admin dashboard as part of daily code management.

Admin flow:
- Admin logs into `/admin`.
- Admin selects route and service date.
- Admin clicks “Generate daily code”.
- System creates a daily 6-digit code tied to route/date/service window.
- Admin dashboard displays the plain code and QR options.

The QR code should encode a rider URL, not just a raw code. Example URLs:
- Static rider entry URL: `/rider`
- Daily direct-access URL: `/rider?code=428193`

The secure object is the daily code validated by Supabase RPC; the QR image is only a convenience wrapper around the URL. For MVP, do not store QR image files in the database. Store the daily code row and generate/render the QR on demand in the admin UI using a small frontend QR library.

Recommended operational model:
- Support both static QR and daily QR.
- Static QR opens `/rider` and asks the rider to enter the daily code manually.
- Daily QR opens `/rider?code=XXXXXX`, auto-fills/auto-validates, and takes the rider directly to the map if valid.

Rider scan points:
- Participating tasting room counter.
- Shuttle stop signage.
- Printed table cards or posters.
- Staff phone/tablet showing the daily QR.
- Shuttle vehicle signage if useful.

Riders scan when they want shuttle information, usually while waiting at a tasting stop/venue or before boarding.

Why support both QR modes:
- Static QR can be printed once and reused permanently.
- Daily QR minimizes rider friction because no typing is required.
- Daily QR may need to be displayed digitally or reprinted each service day.
- Manual code entry remains a fallback if a rider cannot scan the daily QR.

Implementation impact:
- Admin daily-code screen should show the manual code, static QR, and daily direct QR.
- Rider route should auto-validate when `?code=` is present.
- Rider route should show code entry when no code is present.
- Successful rider validation should be stored locally until the code expires.
- Supabase should keep `daily_codes` as the source of truth; QR image storage is unnecessary for MVP.
- Add or confirm `status` on `daily_codes` if code revocation is needed.

### 2026-05-26 — Phase 0 acceptance posture and open MVP requirements

Question: How should we respond to the project framing: “Your Role: Review the architecture and constraints. If you agree to take this on, your first phase of work will involve tackling a specific list of research spikes to pressure-test a few key technical decisions before we transition into full production mode.”?

Answer: Treat this as a formal Phase 0 technical validation engagement before production build. The correct posture is to agree with the architecture direction if the constraints remain valid, then run the defined research spikes before writing production code.

Suggested response:

“I agree with the architecture direction and constraints. I’ll take this on in two phases. First, I’ll run the defined research spikes to pressure-test the decisions that could break the MVP: tile provider, Supabase realtime split, driver auth/RLS, tablet wake lock/GPS reliability, offline queue behavior, and schedule-based ETA. Each spike will produce a written recommendation, implementation impact, remaining risks, and any throwaway prototype needed. Only after those are resolved will I lock the production architecture and move into the MVP implementation plan.”

Already clear from project docs:
- Product is a regional tasting shuttle live-ops web app.
- Users are anonymous riders, PIN-based drivers, and authenticated owner/admins.
- Backend boundary is Supabase: Postgres, Auth, RLS, Realtime Broadcast, RPCs, and Postgres Changes.
- GPS is ephemeral realtime UI state; stop logs are durable business records.
- Driver runtime is Android tablet plus Fully Kiosk Browser.
- Map renderer is MapLibre; OpenFreeMap is the default tile-provider hypothesis until spike results say otherwise.
- MVP excludes rider accounts, booking, payments, native apps, SMS/email notifications, complex dispatch optimization, road-network routing, and historical GPS trails.
- V1 ETA is schedule-based using observed delay from the latest confirmed stop log.
- Routes, stops, buses, and drivers must be configurable data, not code changes.

Implementation impact:
- Do not jump straight into production coding.
- Phase 0 must pressure-test the risky decisions first.
- Production implementation plan should be written only after the open requirements below are answered or explicitly deferred.
- Spike results should be documented in `docs/spikes/YYYY-MM-DD-spike-name.md`.

Open MVP requirement questions to resolve before implementation planning:

Business operation shape:
- How many routes must MVP support on launch: one fixed loop, multiple same-day routes, or one launch route with future multi-route support?
- How many buses are expected at launch: 1, 2, or up to 4?
- Does each bus run the full loop independently, or are buses assigned to different route segments?
- Is service always 10:00–18:00, or should admins configure service windows per route/day in MVP?
- What region/town/area is the first launch route in, for tile-provider testing, map bounds, seed data, and realistic ETA behavior?

Rider flow:
- Should QR codes include the daily code automatically, or should riders scan QR then manually enter the code?
- Should one daily code unlock all active buses on a route, or a specific route only?
- Should riders see one nearest/active shuttle marker, all buses on the route, or labeled buses like “Shuttle 1” and “Shuttle 2”?
- Should rider access persist for the day after entering a valid code, or require re-entry on every reload?
- What should riders see if no bus has broadcast recently: “Shuttle offline”, “Last seen X minutes ago”, hidden marker, or support/contact text?

Driver flow:
- Should drivers identify themselves by selecting name + PIN, typing name + PIN, or entering only a tablet/bus PIN?
- Can one driver switch buses mid-day, or is driver/bus assignment fixed before service starts?
- Should the driver choose bus/route at shift start if not assigned, or should admin pre-assign everything?
- On stop arrival, should the driver tap “Arrived”, then adjust boarded/alighted, then “Confirm”; or enter counts first and submit once?
- Should drivers be able to edit a confirmed stop log in MVP?
- Should drivers be able to mark a stop as skipped, or is skipped-stop handling post-MVP?
- Does occupancy matter in MVP, or should the system only derive boarded/alighted totals from stop logs?

Admin flow:
- Is there one owner/admin account only, or multiple admin users?
- Is any role separation needed in MVP, such as owner vs dispatcher?
- Do admins need full CRUD for routes, stops, buses, drivers, daily codes, and assignments in MVP, or can some setup remain seed-only/admin-lite?
- Should route stops be edited one by one in the UI, or is CSV/import acceptable for MVP setup?
- Should generating a new daily code for the same route/date invalidate the old code, or return/reuse the existing active code?
- What columns are required in CSV export: date, route, bus, driver, stop, scheduled time, arrival time, confirmed time, boarded, alighted, delay minutes?

Supabase and security:
- Are Supabase Auth users acceptable for drivers if the driver-auth spike recommends email-alias users with PIN-as-password?
- Or should drivers avoid Supabase Auth and use a custom RPC with hashed PIN plus narrow RLS strategy?
- Should rider access be purely RPC-returned bootstrap data plus realtime subscription, or does MVP need a short-lived rider session/token pattern?

Realtime and map behavior:
- What freshness threshold defines a bus as stale/offline: 15 seconds, 30 seconds, 60 seconds, or another value?
- Should GPS broadcast frequency be fixed at 5 seconds, or adaptive such as 3 seconds while moving, 5 seconds normal, 15 seconds idle?
- Should the app store last-known bus position snapshots in Postgres every 15–30 seconds for initial map load?
- Should the MVP map show route line geometry, or just stops plus bus marker?

ETA behavior:
- Is every stop scheduled once per loop, or does the route loop repeatedly all day?
- If the route loops repeatedly, are there scheduled times for every stop occurrence, or only headway/frequency?
- What should ETA show after the final stop: next loop first stop, “Completing loop”, or “Service ending”?
- Are early arrivals allowed, and should rider ETA show “Arriving early” or clamp to scheduled time?

Launch and maintenance:
- Should local Supabase development be required from day one, or can MVP start against a Supabase cloud dev project with versioned migrations?
- Preferred hosting: Vercel or Netlify?
- Is this intended to become a reusable shuttle/event transport product later, or is it single-operator for now?

Recommended default if not otherwise answered:
- Use Supabase local migrations in repo and a cloud dev project for realistic realtime/device testing.
- Model route, bus, driver, and stop entities generically.
- Do not build multi-tenant SaaS, billing, or organization abstractions in MVP.
- Store last-known bus position snapshots at low frequency, not every GPS ping.
- Start with stops plus bus marker on the map; add route line only if required for rider clarity.
- Use Supabase Auth for admins. Spike driver auth before choosing between Supabase Auth alias users and custom PIN RPC.

## Template

```markdown
### YYYY-MM-DD — Short topic

Question: [Exact project clarification question]

Answer: [Answer shared]

Implementation impact:
- [What this changes or confirms]
- [Docs/code areas affected]
```
