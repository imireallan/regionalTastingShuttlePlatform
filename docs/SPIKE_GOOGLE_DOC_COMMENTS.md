# Spike Review Comments — Framed for Product Owner

Date: 2026-05-22
Purpose: first-person comment bank you can paste directly into a Google Doc as comments to the product owner.

Tone: clear, collaborative, and honest. These comments assume the spikes have not been tested yet, so they frame the work as hypotheses, risks, and decisions to validate before build.

---

## Opening comment to product owner

I’ve reviewed the architecture direction and I agree with the lean approach: one React/Vite PWA, Supabase for backend/database/auth/realtime, MapLibre for maps, and a kiosk-style driver tablet experience.

My main recommendation is that we treat the next step as a short Phase 0 validation round, not immediate production build. The goal would be to validate the riskiest assumptions quickly, then move into implementation with fewer unknowns.

The biggest risk I see is driver tablet reliability: keeping geolocation active, the screen awake, and the driver page foregrounded for a full operating shift.

---

## General comments I can use throughout the doc

### Comment — Pre-spike status

I’d treat this as a pre-spike assumption rather than a validated result. The direction makes sense, but I’d want to test it before we lock it into the production build.

### Comment — Phase 0 recommendation

My recommendation is to run these as Phase 0 spikes. Each spike should end with a simple decision: proceed, adjust the approach, or de-scope for V1.

### Comment — Scope discipline

I’d keep the spikes tightly scoped. The goal is not to build polished features yet; it’s to reduce uncertainty before we commit engineering time to the full implementation.

### Comment — Risk framing

This looks like the right direction, but I’d call it an engineering hypothesis until we validate it with a small prototype or field test.

### Comment — Decision framing

The output I’d want from this spike is a clear recommendation and decision, not just research notes.

---

# Spike 1: Tile Provider Decision

## Comment — Renderer vs provider

I want to separate two concepts here: MapLibre is the browser map renderer, while OpenFreeMap, Protomaps, and MapTiler are possible tile providers. I’d keep our app code provider-neutral so we can switch tile providers without rewriting the map features.

## Comment — Recommended default

My default recommendation is to test OpenFreeMap first because it is the fastest and lowest-maintenance path for MVP. I would not treat it as final until we test the actual target region and confirm the map quality is good enough.

## Comment — Business preference question

Can you confirm the priority here: lowest cost, paid reliability/support, or long-term control through self-hosting?

That answer affects whether we should bias toward OpenFreeMap, MapTiler, or Protomaps.

## Comment — Region question

Can you share the exact target region and stop locations? I’d prefer to test tile quality around the actual shuttle loop rather than making a generic provider decision.

## Comment — Production safety

I would avoid using raw `tile.openstreetmap.org` for production traffic. We should use a production-safe tile provider or a self-hosted tile approach.

## Comment — Acceptance criteria

For this spike, I’d consider it complete when we have a working MapLibre map for the actual service region, acceptable visual quality, a production-safe usage model, and a fallback option.

## Comment — Risk if skipped

If we skip this validation, we could discover late that the chosen tile provider has poor coverage, unclear usage limits, unexpected cost, or reliability issues.

---

# Spike 2: Supabase Realtime Broadcast for Position

## Comment — Architecture hypothesis

My hypothesis is that Supabase Realtime Broadcast is the right fit for live bus positions because those GPS updates are temporary UI state, not business records.

## Comment — Data split explanation

I would intentionally split the data into two categories:

Live GPS broadcasts answer: “Where is the bus right now?”

Stop logs answer: “What actually happened today?”

That keeps the database small and makes the business metrics more reliable.

## Comment — GPS history question

Can you confirm whether the business needs historical GPS trails, or whether live position plus stop logs is enough for V1?

My recommendation is no historical GPS trail for V1 unless there is a clear operational or compliance need.

## Comment — Freshness question

Is a 3–5 second update interval acceptable for the rider/admin map? That seems reasonable for shuttle tracking, but I’d like to confirm the expected rider experience.

## Comment — Snapshot recommendation

I’d add an optional latest-position snapshot per bus. That way, when a rider/admin opens the map, they can see the last known bus position immediately instead of waiting for the next live broadcast.

## Comment — Prototype recommendation

I’d validate this with a very small prototype: one browser tab emits a fake moving bus, another tab subscribes and renders the marker. Then we test reconnect behavior and latency.

## Comment — Risk if skipped

If we skip this, the risk is that reconnect behavior, channel authorization, or initial map state issues show up during the production build instead of early.

---

# Spike 3: Driver Auth Pattern

## Comment — Main question

The main thing to resolve here is how we give drivers a simple “name + 4-digit PIN” experience while still preserving real Supabase Auth and Row-Level Security.

## Comment — Recommended default

My default recommendation is to map each driver to a Supabase Auth user if possible, even if the UI hides that complexity behind a simple name/PIN flow. That keeps RLS much easier and safer.

## Comment — Driver operations question

Can you clarify how drivers operate day to day? For example: fixed drivers, rotating drivers, shared tablets, assigned buses, or shared buses?

That affects the auth and permissions model.

## Comment — PIN management question

Who should be able to create, reset, or rotate driver PINs? Also, do PINs need to change regularly, or only when staff changes?

## Comment — UX flexibility question

Is “name + PIN” a hard requirement, or would “select your driver name + enter PIN” be acceptable?

The second option is usually simpler and less error-prone on a tablet.

## Comment — RLS dependency

I would not finalize driver RLS policies until we choose the driver auth pattern. That decision affects how we safely restrict each driver to their assigned bus/route.

## Comment — Risk if skipped

If we skip this spike, we risk either making driver writes too permissive or needing to refactor auth/RLS after development has already started.

---

# Spike 4: Wake Lock + Fully Kiosk Reliability

## Comment — Highest-risk spike

This is the most important spike in my view. The architecture depends on the tablet reliably keeping the driver page active and GPS emitting throughout the shift.

## Comment — Not proven yet

Fully Kiosk and the Screen Wake Lock API are the right tools to test, but I would not claim this is reliable until we test it on the actual tablet model under realistic conditions.

## Comment — Tablet model question

What exact Android tablet model will be used? Also, will it be mounted and charging continuously while the shuttle is operating?

## Comment — Provisioning ownership question

Who should own tablet provisioning? My recommendation is that the tablets are shipped/configured as appliances, not left for drivers to configure during service.

## Comment — Acceptance test

I’d define the acceptance test as a 4–8 hour run with the tablet plugged in, `/driver` open in Fully Kiosk, screen awake, geolocation active, and network interruptions simulated.

## Comment — Fallback warning

If this spike fails, we may need to adjust the architecture. Possible fallbacks could include an Android native wrapper, a foreground service, or an external GPS tracker integration.

## Comment — Operational risk

If the tablet sleeps or stops sending GPS, riders see stale or missing shuttle location. That becomes an operations/support issue, not just a code issue.

## Comment — Driver burden

I would design this so the driver does not have to think about keeping the app alive. The tablet setup should make the correct behavior the default.

---

# Spike 5: IndexedDB Buffer/Flush

## Comment — Business priority

For offline handling, I’d prioritize preserving stop taps and passenger counts. Live GPS can temporarily disappear, but operational records should not be lost.

## Comment — GPS vs stop taps

I would treat stop taps differently from GPS pings. Stop taps should be stored and replayed in order. Stale GPS pings should not be replayed as if they are current bus location.

## Comment — Connectivity question

Are there known dead zones or low-signal areas on the route? If yes, how long do they typically last?

That determines whether a light buffer is enough or whether we need more robust offline sync.

## Comment — Driver UX

I’d show clear status in the driver UI, like “offline but saving” and “synced,” so the driver trusts that their taps are not being lost.

## Comment — Background Sync caution

I would not depend only on browser Background Sync because browser support is inconsistent. I’d implement explicit flushing while the app is open.

## Comment — Acceptance criteria

This spike should prove that stop taps created offline are stored locally, replayed in order, not duplicated, and visibly marked as synced after reconnect.

## Comment — Risk if skipped

If we skip this spike, a short signal drop could cause lost counts or duplicate stop events.

---

# Spike 6: Schedule-Based ETA Math

## Comment — V1 recommendation

I agree with schedule-based ETA for V1. A full road-network routing engine feels unnecessary unless the business needs much more precise prediction.

## Comment — Schedule question

Does the shuttle already have a fixed timetable by stop, or is the loop operated more flexibly?

The ETA model depends on this.

## Comment — Rider wording question

How precise should the rider-facing ETA be? Exact minutes, approximate ranges, or friendlier language like “arriving soon” / “running late”?

I’d avoid overpromising precision if the data is approximate.

## Comment — Multi-bus question

When multiple buses are on the same loop, should riders see all buses, the next arriving bus, or the nearest bus?

## Comment — Skipped stop question

What should the system show if a driver skips a stop or forgets to tap Arrived?

This is both a UX and operations question.

## Comment — Acceptance criteria

I’d consider this spike complete when the formula handles: no prior stop, late bus, early bus, loop rollover, skipped/forgotten stop, and multiple buses.

## Comment — Risk if skipped

If we do not align on ETA behavior early, the rider UI may imply a level of precision that the system cannot reliably support.

---

# Spike 7: PWA Install + Permissions UX

## Comment — Rider install recommendation

I would not require riders to install the PWA. For V1, QR-to-mobile-web should be the primary flow. Installation can be optional later.

## Comment — Driver install recommendation

For drivers, I would not rely on normal PWA installation. I’d make the driver experience kiosk-first: a preconfigured tablet opens `/driver` in Fully Kiosk Browser.

## Comment — Operations question

Are you comfortable treating tablet setup as part of the operational deliverable rather than expecting drivers to configure devices themselves?

## Comment — Permission handling

Driver geolocation permissions should be handled during tablet provisioning, not during the first live service shift.

## Comment — Device/browser test

I’d test the rider QR flow on iOS Safari and Android Chrome, and test the driver flow in Fully Kiosk over HTTPS.

## Comment — Acceptance criteria

This spike should prove that riders can open the QR link without installation, the driver tablet opens `/driver` reliably, permissions are documented, and failure states have recovery instructions.

## Comment — Risk if skipped

If we skip this, launch-day issues may come from browser permissions and device setup rather than the application logic itself.

---

# Comments for call agenda

## Comment — Route facts

Before implementation, I’d want to confirm the exact service region, stop list, route sequence, schedule, and known low-signal areas.

## Comment — Device facts

I’d also want to confirm the tablet model, mounting/charging setup, whether Fully Kiosk is acceptable, and who owns provisioning.

## Comment — Operations facts

Operationally, I’d want to clarify who generates daily codes, who manages driver PINs, and who responds if a bus disappears from the map during service.

## Comment — Analytics expectations

Can you confirm whether stop-level boarded/alighted counts are sufficient for V1 metrics, or whether you expect GPS history as part of operations reporting?

## Comment — V1 non-goals

I’d like to confirm that V1 excludes rider accounts, booking, payments, native apps, road-network routing, and robust dead-zone offline sync unless a spike proves one of those is necessary.

---

# Short comments I can reuse anywhere

## Reusable comment — Assumption

I’m treating this as an assumption until we validate it in Phase 0.

## Reusable comment — PO confirmation

Can you confirm this operational assumption?

## Reusable comment — Scope risk

If this requirement changes, it may expand V1 scope and affect the delivery timeline.

## Reusable comment — Keep simple

My recommendation is to keep this simple for V1 unless there is a hard operational need.

## Reusable comment — Defer

This feels like a post-MVP enhancement unless field testing proves it is required for launch.

## Reusable comment — Go/no-go

I’d treat this as a go/no-go validation item before full production build.

## Reusable comment — Fallback

I’d like us to define the operational fallback if this technical assumption fails during service.

## Reusable comment — Needs evidence

I agree with the direction, but I’d want a small prototype or field test before calling this final.

---

# Phrases to avoid and better replacements

Avoid:
“This is confirmed.”

Use:
“This is the recommended direction pending spike validation.”

Avoid:
“This will work.”

Use:
“This should be validated with a small prototype before build.”

Avoid:
“No backend needed.”

Use:
“My current recommendation is no custom backend for V1 unless a spike proves Supabase RPC/RLS is insufficient.”

Avoid:
“Offline is solved.”

Use:
“Light offline buffer/flush is the recommended V1 approach; robust offline sync should be deferred unless route dead zones require it.”

Avoid:
“The map provider is OpenFreeMap.”

Use:
“OpenFreeMap is the first provider I’d test; the final provider should be selected after target-region validation.”
