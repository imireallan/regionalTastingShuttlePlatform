# Research Spikes

Date: 2026-05-22

These spikes must be completed before full production implementation. Each spike should produce a short written result, a recommendation, and any throwaway prototype code required to prove the decision.

## Pressure-testing method

Pressure-testing means validating the riskiest assumptions with small throwaway prototypes before production work starts. Do not treat a spike as desk research only. A useful spike must be able to fail.

For every spike:

1. Define the kill question
   - What would make this approach unacceptable for MVP?
   - Example: If Supabase Broadcast cannot reconnect reliably with 2-4 buses, the realtime architecture must change.

2. Build the smallest observable prototype
   - Keep it isolated from production code.
   - Prefer something visible: a browser page, simple UI, runnable script, or focused test.
   - Hardcode where useful. The goal is decision evidence, not reusable code.

3. Test happy path and failure path
   - Happy path proves the approach can work.
   - Failure path shows how it breaks and what recovery looks like.

4. Measure concrete signals
   - Latency.
   - Reconnect behavior.
   - Battery/thermal impact.
   - Permission behavior.
   - RLS enforcement.
   - Setup complexity.
   - Cost and maintenance risk.

5. Write a verdict
   - `VALIDATED`: safe enough for MVP.
   - `PARTIAL`: usable only with documented constraints.
   - `INVALIDATED`: do not use this approach for production.

6. Document implementation impact
   - What production decision changed?
   - What files/modules/schema/policies will this affect?
   - What risk remains after the spike?

Decision scoring for each spike:

| Dimension | Score 1-5 | Notes |
|---|---:|---|
| Reliability |  |  |
| Setup complexity |  |  |
| Maintenance burden |  |  |
| Cost |  |  |
| Security/RLS fit |  |  |
| User experience |  |  |
| Fallback availability |  |  |

Interpretation:
- 4-5: acceptable production default.
- 3: acceptable only with constraints.
- 1-2: avoid, redesign, or de-scope.

Recommended execution order by existential risk:

1. Wake Lock + Fully Kiosk reliability.
2. Supabase Realtime split.
3. Driver auth + RLS.
4. IndexedDB buffer/flush.
5. Tile provider decision.
6. Schedule-based ETA.
7. PWA install and permissions UX.

A spike is successful even if it invalidates the current hypothesis. The goal is to find where the architecture breaks before spending weeks building the wrong thing.

## Spike 1: Tile provider decision

Question: Should V1 use OpenFreeMap, self-hosted Protomaps `.pmtiles`, or MapTiler?

Acceptance:
- Working MapLibre map for target region.
- No use of `tile.openstreetmap.org`.
- Recommendation covers cost, reliability, setup time, license risk, and fallback.

Default hypothesis:
- Start with OpenFreeMap for fastest MVP.
- Keep Protomaps as future control/risk-reduction path.

## Spike 2: Supabase Realtime split

Question: Does Broadcast for GPS + Postgres Changes for stop_logs behave reliably for 2-4 buses pinging every 3-5 seconds?

Prototype:
- One browser tab emits moving marker payloads.
- Second tab subscribes and renders marker.
- Separate stop_log insert triggers dashboard listener.

Acceptance:
- Reconnect behavior documented.
- Payload latency acceptable for rider UX.
- No database write per GPS ping.

## Spike 3: Driver auth pattern

Question: Best implementation of driver name + 4-digit PIN in Supabase?

Options:
- Per-driver email alias + PIN as password.
- Supabase anonymous sign-in + custom driver claim.
- Custom RPC + hashed PIN with narrow RLS strategy.

Acceptance:
- Recommended pattern.
- RLS policy sketch.
- Driver can only write own bus logs.
- Admin can rotate/reset PIN.

## Spike 4: Wake Lock + Fully Kiosk reliability

Question: Can a budget Android tablet keep screen/GPS active for a full 8-hour shift?

Acceptance:
- Device model tested.
- Fully Kiosk settings documented.
- Wake Lock API behavior documented.
- Battery/charging/thermal notes captured.
- Go/no-go recommendation.

This is the highest-risk spike. Do not commit to web-only driver tracking until this clears.

## Spike 5: IndexedDB buffer/flush

Question: What is the minimal reliable local queue for GPS pings and stop taps?

Acceptance:
- Stop taps are never lost during short signal blips.
- Stop tap replay preserves order.
- Stale GPS pings are not replayed as if current.
- Queue has retry/backoff and visible driver state.

Recommended stance:
- Persist stop events and critical status transitions.
- For GPS, keep latest unsent position only or short TTL queue.

## Spike 6: Schedule-based ETA

Question: Can schedule + observed delay produce acceptable rider ETA without routing engine?

Acceptance:
- Formula documented.
- Handles bus ahead of schedule.
- Handles skipped stop.
- Handles no prior stop log.
- Handles route loop rollover.

## Spike 7: PWA install and permissions UX

Question: What is the cleanest rider/driver onboarding flow for PWA install and geolocation permissions?

Acceptance:
- Driver permission flow tested on tablet.
- Rider add-to-home-screen guidance tested on iOS/Android.
- Failure states documented.

## Spike pressure-test checklist

Use this checklist while executing each spike.

### Spike 1: Tile provider decision

Pressure tests:
- Build a minimal MapLibre page for the target region.
- Test OpenFreeMap, Protomaps/PMTiles, and MapTiler if practical.
- Add sample stops and a moving bus marker.
- Test mobile browser load time and weak-network behavior.
- Review cost, terms/license risk, reliability, setup effort, and fallback.

Failure signs:
- Target region renders poorly or slowly.
- Provider terms are unsuitable for production embedding.
- Setup requires too much operational maintenance for MVP.
- No credible fallback path exists.

Production decision:
- Choose the V1 tile provider.
- Keep provider config isolated so the app can swap providers later.

### Spike 2: Supabase Realtime split

Pressure tests:
- Browser tab A emits fake moving GPS payloads every 3-5 seconds.
- Browser tab B subscribes and renders a moving marker.
- Simulate 1, 2, and 4 buses.
- Insert/update stop_logs separately and confirm admin listener receives Postgres Changes.
- Kill/restart network and document reconnect behavior.
- Confirm no database write occurs per GPS ping.

Failure signs:
- Reconnect is unreliable.
- Latency is visibly bad for rider UX.
- Channels become difficult to scope or secure.
- Stop log changes do not appear reliably.

Production decision:
- Confirm Broadcast for `route:{route_id}:positions`.
- Confirm Postgres Changes for `stop_logs`.
- Decide whether to add low-frequency `bus_position_snapshots` for initial map load.

### Spike 3: Driver auth pattern

Pressure tests:
- Compare Supabase Auth alias users, anonymous/custom claims, and custom RPC + hashed PIN.
- Prove the chosen pattern can enforce RLS.
- Confirm driver can only read/write assigned bus/route/stop logs.
- Confirm driver cannot write another bus's logs.
- Confirm admin can reset/rotate PIN and deactivate driver.

Failure signs:
- RLS depends on frontend trust.
- Driver identity cannot be tied safely to database policies.
- PIN reset/deactivation is awkward or unsafe.
- The pattern requires a custom backend just to work.

Production decision:
- Choose final driver auth model.
- Lock the driver-related schema and RLS policy shape.

### Spike 4: Wake Lock + Fully Kiosk reliability

Pressure tests:
- Test on the actual or closest available Android tablet.
- Run Fully Kiosk Browser with a minimal driver tracking page.
- Request geolocation and Wake Lock API.
- Broadcast position every 3-5 seconds during a realistic long-running session.
- Keep the tablet plugged in if that is the real operating model.
- Observe sleep, throttling, GPS continuity, battery, charging, and thermal behavior.
- Test denied permission and reconnect scenarios.

Failure signs:
- Screen sleeps or page is killed.
- GPS stops updating.
- Browser throttles timers badly.
- Battery drains while plugged in.
- Device overheats.
- Permission recovery is too fragile for drivers.

Production decision:
- Go/no-go on web-only driver tracking.
- Document required tablet model/settings and Fully Kiosk configuration.

### Spike 5: IndexedDB buffer/flush

Pressure tests:
- Build a tiny page with Arrived, boarded/alighted counters, Confirm, and queue status.
- Simulate offline mode.
- Queue stop arrival and confirmation while offline.
- Refresh before reconnecting.
- Reconnect and flush in order.
- Simulate duplicate taps and partial flush failure.
- Confirm stale GPS pings are not replayed as current.

Failure signs:
- Stop taps are lost after refresh/offline.
- Replay order is wrong.
- Duplicate stop logs are created.
- Driver cannot tell whether an event is queued, synced, or failed.

Production decision:
- Define `offlineQueue.ts` behavior.
- Decide whether stop events need client-generated idempotency keys.
- Persist stop events; keep only latest/short-TTL GPS state.

### Spike 6: Schedule-based ETA

Pressure tests:
- Write pure ETA fixtures/tests.
- Cover no prior stop log, late bus, early bus, final stop, loop rollover, skipped stop, multiple buses, service ended, out-of-order logs, and missing confirmation.
- Confirm output includes next stop, ETA timestamp/minutes, and rider-friendly wording.

Failure signs:
- ETA becomes confusing when bus is early.
- Loop rollover is ambiguous.
- Skipped stops produce obviously wrong rider guidance.
- Formula needs data not available in MVP.

Production decision:
- Lock the V1 ETA formula.
- Implement as a pure tested frontend/domain function before UI wiring.

### Spike 7: PWA install and permissions UX

Pressure tests:
- Test rider QR/code flow on iOS Safari and Android Chrome.
- Test driver `/driver` flow on Android/Fully Kiosk.
- Test first-time geolocation permission, denied permission, reload, installed PWA/browser-tab behavior, and weak/offline network.
- Document rider add-to-home-screen guidance if needed.

Failure signs:
- Driver cannot recover from denied geolocation.
- Browser/PWA mode behaves inconsistently enough to confuse operations.
- Fully Kiosk launch/provisioning requires undocumented manual steps.

Production decision:
- Define onboarding copy and failure states.
- Create tablet provisioning/runbook requirements.

## Spike reporting template

For each spike, create `docs/spikes/YYYY-MM-DD-spike-name.md`:

```markdown
# Spike: [Name]

## Question
What exact risk are we testing?

## Why this matters
What production decision depends on this?

## Prototype
What was built or tested?

## Test setup
- Device/browser:
- Supabase project:
- Region:
- Network:
- Test data:

## Pressure tests
- Happy path:
- Failure path:
- Edge cases:

## Findings
Concrete observations, not vibes.

## Decision
VALIDATED / PARTIAL / INVALIDATED

## Recommendation
What should production use?

## Implementation impact
What files/modules/schema/policies will this affect?

## Risks remaining
What still needs monitoring or later hardening?
```
