# Spike Research Brief for Product Owner Call

Date: 2026-05-22
Purpose: comment-ready brief for the 2pm product owner call.

How to use this in Google Docs:
- Paste this whole file into a Google Doc.
- Add comments on lines marked `PO COMMENT:` or `DECISION NEEDED:`.
- Treat `Recommendation` as the engineering default unless the PO has business constraints we do not know yet.

---

## Executive Summary

The proposed architecture is sound for a lightweight shuttle-tracking MVP:

- React + Vite PWA for all user roles.
- Supabase for Postgres, Auth, RLS, RPCs, and Realtime.
- MapLibre for browser map rendering.
- Production-safe tile provider to be selected.
- Driver Android tablet locked down with Fully Kiosk Browser.

The highest-risk item is not Supabase or maps. It is driver tablet reliability: browser geolocation + screen wake + kiosk behavior over a full operating day.

Recommended call position:

1. Keep the architecture simple.
2. Do not build a custom backend for V1.
3. Do not persist every GPS ping.
4. Complete a short Phase 0 spike round before production build.
5. Make the tablet/kiosk test the hard go/no-go gate.

---

# Spike 1: Tile Provider Decision

## Question

Should V1 use OpenFreeMap, self-hosted Protomaps `.pmtiles`, MapTiler, or another tile provider?

## Background

MapLibre is the frontend renderer. It draws the interactive map in the browser.

OpenFreeMap, Protomaps, and MapTiler are tile/data providers. They supply the actual road/label/map data that MapLibre renders.

The shuttle marker itself does not come from the tile provider. It comes from our driver GPS data via Supabase Realtime.

## Findings

### OpenFreeMap

Official positioning:
- Lets apps display custom maps for free.
- Can use public instance or self-host.
- Public instance claims no registration, no API keys, no cookies, and no limits on map views/requests.
- Uses OpenStreetMap data and OpenMapTiles schema.
- Attribution is required; MapLibre can handle this automatically.

Source:
- https://openfreemap.org/

Pros:
- Fastest path to MVP.
- No key management.
- No per-load billing.
- Compatible with MapLibre.
- Good fit for a small regional shuttle app if reliability is acceptable.

Cons/Risks:
- Public free infrastructure is still an external dependency.
- Need to validate target-region coverage and style quality.
- Need fallback plan if service reliability changes.

### Protomaps / PMTiles

Official positioning:
- PMTiles can be read directly from cloud storage.
- Requires `pmtiles` JavaScript library.
- Integrates with MapLibre through `maplibregl.addProtocol("pmtiles", protocol.tile)`.
- Tiles can be hosted as static files, typically on object storage/CDN.

Source:
- https://docs.protomaps.com/pmtiles/maplibre

Pros:
- Best control and long-term vendor-risk reduction.
- Can be very cheap for a known regional operating area.
- No third-party tile API dependency at runtime beyond your own hosting/CDN.
- Good long-term option if service grows.

Cons/Risks:
- More setup work.
- Need to create/select regional PMTiles data.
- Need hosting/CDN configuration.
- Need update strategy for map data.

### MapTiler

Official positioning:
- Commercial map platform with MapLibre GL JS support.
- Provides map styles, tiles, APIs, key management, analytics, and hosted reliability.

Sources:
- https://docs.maptiler.com/maplibre-gl-js/
- https://www.maptiler.com/

Pros:
- Commercial reliability/support.
- Good docs and MapLibre compatibility.
- Easier than self-hosting.
- Good if the PO wants vendor-backed dependability.

Cons/Risks:
- Paid usage and potential cost growth.
- API key/domain restriction management.
- Vendor dependency.

## Recommendation

Use MapLibre as fixed renderer.

For MVP, test OpenFreeMap first. If it performs well in the target region, use it for V1.

Keep the implementation tile-provider-neutral so we can switch to Protomaps or MapTiler without rewriting map features.

## DECISION NEEDED: PO/business input

- Is the product owner comfortable relying on a free public tile provider for launch if the spike confirms it works?
- Is paid vendor reliability preferred even for a low-traffic MVP?
- Is there a known target region we should test immediately?
- Is offline/low-signal map loading expected on the route?

## PO COMMENT:

[Add PO preference here: free/fast vs paid/reliable vs self-hosted/control]

---

# Spike 2: Supabase Realtime Broadcast for Position

## Question

Does Supabase Realtime Broadcast work for 2-4 buses sending positions every 3-5 seconds, with riders/admin subscribed to live updates?

## Findings

Supabase Broadcast is designed for low-latency messages between clients. Messages can be sent from client libraries, REST APIs, or directly from the database.

Broadcast uses WebSockets to connected clients.

Source:
- https://supabase.com/docs/guides/realtime/broadcast

For this app:
- Driver tablet emits bus location.
- Riders/admins subscribe to route-specific channel.
- Position is ephemeral: if no one is listening, the message is gone.
- We do not write every GPS ping to Postgres.

Expected traffic:
- 2 buses at every 5 seconds = 24 messages/minute.
- 4 buses at every 3 seconds = 80 messages/minute.
- This is tiny compared to normal realtime workloads, but reconnect behavior must be tested.

## Recommendation

Use Supabase Broadcast for live positions.

Use Postgres Changes only for durable facts like stop_logs.

Add optional `bus_position_snapshots` table to store one latest row per bus, updated every 15-30 seconds or on meaningful movement, so the map is not blank on first load.

## Prototype needed

- Tab A: fake driver emits moving marker every 3 seconds.
- Tab B: rider/admin subscribes and renders marker.
- Force disconnect/reconnect.
- Confirm latest marker resumes quickly.
- Confirm no GPS ping writes to Postgres.

## DECISION NEEDED: PO/business input

- Is live map freshness of 3-5 seconds acceptable?
- Should admin require a last-known-position even if the driver tablet disconnects?
- Does the owner need historical GPS trails? Current recommendation: no for V1.

## PO COMMENT:

[Add required freshness, historical tracking expectation, and acceptable offline behavior]

---

# Spike 3: Driver Auth Pattern

## Question

What is the cleanest way to support “driver name + 4-digit PIN” while preserving Supabase RLS security?

## Options

### Option A: Supabase Auth user per driver

Pattern:
- Create one auth user per driver.
- Use generated email alias, e.g. `driver-bus1@internal.local`.
- PIN acts like password.

Pros:
- Uses Supabase Auth sessions normally.
- RLS can reference `auth.uid()`.
- Easier to reason about permissions.

Cons:
- PIN-as-password is weaker than normal auth.
- Need admin reset flow.
- Email alias is artificial.

### Option B: Custom `driver_login` RPC with hashed PIN

Pattern:
- Store driver PIN hash in `drivers` table.
- RPC checks name/PIN.
- Returns driver/bus/route context.

Pros:
- Matches desired UX exactly.
- Admin can manage PINs easily.

Cons:
- Harder to integrate with Supabase RLS unless paired with an auth session or secure token strategy.
- Must be designed carefully to avoid insecure pseudo-auth.

### Option C: Supabase anonymous auth + driver claim/context

Pattern:
- Start anonymous auth session.
- Driver PIN maps session to driver context.

Pros:
- Avoids fake email accounts.
- Could preserve session identity for RLS.

Cons:
- More advanced Supabase Auth/RLS design.
- Needs spike validation.

## Recommendation

Default recommendation for MVP: Supabase Auth user per driver, with admin-managed credentials/PIN, unless spike proves a cleaner anonymous/custom-claim pattern.

Reason:
- RLS is simpler and safer when each driver maps to an authenticated user.
- We can keep the UI as “name + PIN” even if the underlying implementation uses an email alias.

## DECISION NEEDED: PO/business input

- How many drivers exist at launch?
- Will drivers share tablets/buses or have assigned tablets?
- Does the owner need to rotate PINs daily/weekly, or only when staff changes?
- Is “name + PIN” a hard requirement, or can the driver select their name then enter PIN?

## PO COMMENT:

[Add driver staffing/operations reality]

---

# Spike 4: Wake Lock + Fully Kiosk Reliability

## Question

Can a budget Android tablet keep the shuttle driver page active, screen awake, and geolocation emitting for a full operating shift?

## Findings

### Screen Wake Lock API

MDN states the Screen Wake Lock API prevents devices from dimming, locking, or turning off the screen when an app needs to keep running.

It requires a secure context, meaning HTTPS or localhost.

Wake locks can be released when document visibility changes; apps should reacquire on `visibilitychange` when visible again.

Source:
- https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API

### Fully Kiosk Browser

Fully Kiosk Browser is an Android kiosk browser/app-lockdown tool.

Relevant documented features:
- fullscreen mode
- device lockdown/kiosk mode
- keep screen on
- set brightness/orientation
- wakelocks
- autostart on boot
- bypass lockscreen
- HTML5 geolocation access
- remote admin options

Source:
- https://www.fully-kiosk.com/en/#features

## Recommendation

This is the highest-risk spike and should be the go/no-go gate.

Do not fully commit to the driver web-tracking architecture until a real tablet survives a realistic test.

## Prototype needed

Test on actual budget Android tablet:
- Install/configure Fully Kiosk Browser.
- Open hosted HTTPS `/driver` prototype.
- Grant geolocation permission.
- Enable keep-screen-on/wakelock settings.
- Keep tablet plugged in.
- Run 4-8 hour test.
- Log whether GPS updates continue.
- Simulate bad network/reconnect.
- Check thermal/battery behavior.

## Recommendation for call

Tell PO: “The architecture is good, but this one physical/device assumption must be tested early. If it fails, the fallback may be native wrapper, Android foreground service, or dedicated GPS tracker integration.”

## DECISION NEEDED: PO/business input

- What exact tablet model will be used?
- Will tablets be mounted and charging continuously?
- Who provisions and maintains the tablets?
- Is the owner okay with shipping pre-configured tablets as part of the deliverable?
- Is there a fallback if browser geolocation fails during service?

## PO COMMENT:

[Add tablet model, mounting/charging details, ownership of device provisioning]

---

# Spike 5: IndexedDB Buffer/Flush

## Question

What is the minimal reliable offline queue for GPS pings and stop taps?

## Findings

IndexedDB is the browser-native async database for structured client-side storage.

Source:
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

Background Sync can defer tasks until a stable network connection returns, but MDN marks it as limited availability and not Baseline because it does not work in some major browsers.

Source:
- https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API

## Recommendation

Use IndexedDB directly for V1. Do not depend on Background Sync as the only flush mechanism.

Flush when:
- app starts
- network returns
- Supabase client reconnects
- driver performs next action
- periodic timer while app is open

Queue strategy:
- Stop taps: durable queue, replay in order, never drop silently.
- GPS pings: do not replay stale GPS positions. Store latest unsent position only or short TTL queue.

## Prototype needed

- Simulate offline mode.
- Driver taps Arrived and Confirm.
- Verify events are stored in IndexedDB.
- Restore network.
- Verify events flush in order.
- Verify UI clearly shows queued/synced state.

## DECISION NEEDED: PO/business input

- Are there known dead zones on the route?
- How long can the route be offline at worst?
- Is losing live GPS for a short period acceptable if stop counts are preserved?
- Should driver UI show “offline but saving taps” status?

## PO COMMENT:

[Add route connectivity expectations]

---

# Spike 6: Schedule-Based ETA Math

## Question

Can V1 use schedule + observed delay instead of road-network routing?

## Findings

The project brief already chooses schedule-based ETA for V1.

This is the right call because:
- A routing engine is overkill for a fixed regional loop.
- Riders need approximate next-stop timing, not turn-by-turn prediction.
- Driver stop logs give us observed delay.

Formula:

```text
observed_delay = actual_arrival_at_latest_stop - scheduled_time_for_latest_stop
next_stop_eta = scheduled_time_for_next_stop + observed_delay
eta_minutes = next_stop_eta - now
```

Edge cases:
- No prior stop event: use raw schedule.
- Bus ahead of schedule: show “early” or “on time” rather than negative minutes.
- Missed/skipped stop: infer from later stop for V1, add explicit skipped state later if needed.
- Loop rollover: service_date and sequence handling must be explicit.
- Multiple buses on same route: ETA should be per bus, then rider UI can show nearest/next bus.

## Recommendation

Use schedule-based ETA for V1.

Do not add routing engine.

## DECISION NEEDED: PO/business input

- Does the owner already have a fixed timetable per stop?
- Is the loop schedule strict or approximate?
- Should riders see exact minutes, ranges, or status text like “around 10 min”?
- What should happen when a bus skips a stop?

## PO COMMENT:

[Add ETA wording preference and schedule reality]

---

# Spike 7: PWA Install + Permissions UX

## Question

What is the cleanest onboarding flow for riders and drivers around PWA install and permissions?

## Findings

Driver geolocation requires browser permission and secure context.

Wake Lock also requires secure context.

PWA install behavior varies across iOS/Android. We should not make rider app install mandatory.

Driver app should run in Fully Kiosk Browser, not rely on a driver manually adding the PWA to home screen.

## Recommendation

Rider:
- QR opens normal mobile web page.
- Do not require install.
- Optional “Add to Home Screen” prompt only if useful.

Driver:
- Use preconfigured Fully Kiosk Browser pointed to `/driver`.
- Permission/setup is part of tablet provisioning, not something drivers figure out during service.

Admin:
- Normal browser login.
- Desktop-first but tablet-compatible.

## Prototype needed

- Test iOS Safari rider access.
- Test Android Chrome rider access.
- Test driver in Fully Kiosk over HTTPS.
- Document exact permission prompts and setup steps.

## DECISION NEEDED: PO/business input

- Should riders ever be asked to install the app, or is QR web access enough?
- Who owns driver tablet setup before launch?
- Is there a support person available on service days?

## PO COMMENT:

[Add onboarding/support preference]

---

# Recommended 2pm Call Agenda

## 1. Confirm business operating assumptions

Ask:
- What is the exact service region and route?
- How many stops on the primary loop?
- Is there a fixed schedule by stop?
- Are there known low-signal/dead-zone areas?
- What tablet model will drivers use?
- Are tablets mounted and charging all day?

## 2. Confirm V1 scope discipline

Say:
- “V1 is not booking, payments, rider accounts, or native apps.”
- “V1 is live tracking, stop logging, daily access code, and owner dashboard.”

Ask:
- Is anything missing from that V1 definition?

## 3. Confirm acceptable tracking behavior

Ask:
- Is 3-5 second live position freshness acceptable?
- Do you need historical GPS trails, or only stop logs/metrics?
- Is last-known-position enough when a bus disconnects?

Recommended answer:
- No historical GPS trails for V1.
- Persist stop logs and optional last-known-position only.

## 4. Confirm operational ownership

Ask:
- Who creates daily codes?
- Who manages driver PINs?
- Who provisions tablets?
- Who responds if a tablet goes offline during service?

## 5. Agree Phase 0 exit gates

Proposed gates:
- Tile provider chosen.
- Supabase realtime prototype works.
- Driver auth/RLS pattern chosen.
- Real tablet passes kiosk/geolocation test.
- Offline stop-tap queue works.
- ETA formula accepted.

---

# Recommended Decisions to Push For

## Decision 1

Use MapLibre + OpenFreeMap for first map spike, with provider-swappable config.

Reason:
Fastest way to prove map UX without locking into a provider.

## Decision 2

Use Supabase Broadcast for live GPS and Postgres `stop_logs` for durable facts.

Reason:
Keeps DB small and matches the product need.

## Decision 3

Make tablet/kiosk reliability the go/no-go spike.

Reason:
This is the real architecture risk.

## Decision 4

Do not build a custom backend for V1.

Reason:
Supabase RPC/RLS covers the current business workflows.

## Decision 5

Do not build robust offline sync for V1 unless route dead zones force it.

Reason:
Use light buffer/flush now; expand only if field testing proves it necessary.

---

# Source Links

- OpenFreeMap: https://openfreemap.org/
- Protomaps PMTiles with MapLibre: https://docs.protomaps.com/pmtiles/maplibre
- MapTiler MapLibre docs: https://docs.maptiler.com/maplibre-gl-js/
- Supabase Realtime Broadcast: https://supabase.com/docs/guides/realtime/broadcast
- Supabase Database Functions: https://supabase.com/docs/guides/database/functions
- Supabase JS RPC: https://supabase.com/docs/reference/javascript/rpc
- MDN Screen Wake Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- MDN IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN Background Sync API: https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API
- Fully Kiosk Browser features: https://www.fully-kiosk.com/en/#features
