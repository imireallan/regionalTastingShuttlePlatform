# Product Requirements Document

Date: 2026-05-22
Product: Regional Tasting Shuttle Platform
Status: Pre-build MVP

## 1. Product goal

Build a single cloud-hosted web app that lets anonymous riders track a tasting shuttle, lets drivers log stop events from mounted tablets, and lets the owner manage daily operations.

The product optimizes for rapid delivery, small operational footprint, and low long-term maintenance.

## 2. Success criteria

MVP succeeds if:
- Riders can scan QR, enter daily code, and view a live bus map in under 15 seconds.
- Driver tablet can stay awake and continuously publish location during an 8-hour shift.
- Driver can log arrival + passenger on/off counts in under 10 seconds per stop.
- Owner can generate daily access code without engineering support.
- Owner can assign buses to routes through admin data, not code changes.
- Admin dashboard shows current buses, latest stop logs, ridership totals, and on-time signal.

## 3. Users and jobs-to-be-done

### Rider

Anonymous passenger at a tasting stop.

Needs:
- Access shuttle info quickly without account creation.
- See shuttle location and next-stop ETA.
- Understand whether the shuttle is active today.

Does not need:
- Booking, payment, profile, saved preferences.

### Driver

Shuttle driver with mounted Android tablet.

Needs:
- Start shift and select/confirm assigned bus.
- Keep GPS sharing active with minimal interaction.
- Tap arrived at each stop.
- Record boarded/alighted counts.
- Recover gracefully from short connectivity drops.

### Owner/Admin

Business operator.

Needs:
- Configure routes, stops, buses, drivers.
- Generate daily access code.
- Assign buses/drivers/routes.
- Watch buses live.
- Review ridership and stop-level activity.
- See operational issues quickly.

## 4. MVP scope

### Rider app

- QR/deep link opens rider route.
- Daily access code validation.
- Route stop list.
- Live shuttle marker(s) for active route.
- Next stop and ETA text.
- Basic service status: active/inactive/offline.
- Mobile-first UI.

### Driver app

- PIN-based lightweight driver login.
- Select/confirm bus assignment if not pre-assigned.
- Geolocation permission flow.
- Screen wake lock.
- Broadcast live position every 3-5 seconds while active.
- Stop list with next expected stop highlighted.
- Arrived action creates stop log.
- Boarded/alighted counters.
- Confirm action locks/logs event.
- Light IndexedDB buffer for GPS pings and stop taps during signal blips.

### Admin app

- Admin login via Supabase Auth email/password.
- CRUD routes, stops, buses, drivers.
- Generate daily route code.
- Assign bus to route.
- View current bus status and last-known position.
- View stop logs and daily totals.
- Export stop logs CSV.

## 5. Explicit non-goals for V1

- Native iOS/Android apps.
- Rider accounts.
- Booking or payments.
- SMS/email notifications.
- Complex dispatch optimization.
- Road-network routing engine.
- Historical GPS trail persistence.
- Multi-tenant SaaS billing/admin.
- Robust offline sync for long dead zones.

## 6. Functional requirements

### Access code

- Code is generated per route/date.
- Code is valid during service window, default 10:00-18:00 local time.
- Code grants rider access to route stops and live position channel.
- Invalid/expired code shows a friendly error and support text.

### Position tracking

- Driver sends ephemeral realtime position broadcasts.
- Rider/admin clients subscribe to route channel.
- Position payload includes bus id, route id, lat/lng, heading if available, speed if available, timestamp.
- Optionally upsert last-known-position per bus for initial map load.

### Stop logging

- Stop logs are append-first operational facts.
- Arrival creates a row with boarded/alighted defaulting to 0.
- Confirm finalizes counts.
- Dashboard metrics derive from stop_logs, not mutable occupancy.

### ETA

- V1 ETA is schedule-based.
- Compute observed delay from latest confirmed arrival compared to scheduled_time.
- Next-stop ETA = next scheduled_time + observed delay - now.
- If no event exists, ETA = scheduled_time - now.

## 7. Non-functional requirements

- Mobile-first; rider works well on Safari/Chrome mobile.
- Driver UI usable on mounted tablet in sunlight with large tap targets.
- No production use of `tile.openstreetmap.org`.
- Route/stops/buses must be configurable data.
- System must tolerate short connectivity drops without losing stop taps.
- Security enforced primarily by Supabase RLS and narrow RPCs/views.
- Frontend should be deployable by git push.

## 8. Acceptance criteria

- Given a valid daily code, rider sees active route map and shuttle marker.
- Given an expired code, rider cannot access live route data.
- Given driver is logged in, tablet can emit positions every 3-5 seconds.
- Given driver taps Arrived with zero passenger movement, a stop_log row still exists.
- Given bus route assignment changes in admin, rider/driver reflect new route without redeploy.
- Given network drops during a stop tap, event is queued locally and flushed on reconnect.
- Given admin opens dashboard, they can see daily boarded/alighted totals grouped by stop.
