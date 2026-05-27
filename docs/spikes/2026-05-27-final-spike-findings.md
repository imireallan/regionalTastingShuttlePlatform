# Regional Tasting Shuttle: Final Spike Findings (001-007)

Date: 2026-05-27

<table>
  <tr>
    <td><strong>Overall spike program status</strong></td>
    <td><span style="color:#f59e0b"><strong>PARTIAL COMPLETE</strong></span></td>
  </tr>
  <tr>
    <td><strong>Validated spikes</strong></td>
    <td><span style="color:#16a34a"><strong>5 / 7</strong></span></td>
  </tr>
  <tr>
    <td><strong>Partially validated spikes</strong></td>
    <td><span style="color:#f59e0b"><strong>2 / 7</strong></span></td>
  </tr>
  <tr>
    <td><strong>Primary blockers before full confidence</strong></td>
    <td><span style="color:#dc2626"><strong>Tablet/Fully Kiosk field validation (001, 002, 005)</strong></span></td>
  </tr>
</table>

## Executive summary

| Spike | Status | Decision | Production stance |
|---|---|---|---|
| 001 Wake Lock + Fully Kiosk | <span style="color:#f59e0b"><strong>PENDING</strong></span> | Pending real tablet test | Keep architecture provisional until tablet run completes |
| 002 Supabase Realtime Split | <span style="color:#f59e0b"><strong>PARTIAL</strong></span> | Desktop split validated | Keep Broadcast (GPS) + Postgres Changes (stop logs), validate on tablet/mobile network |
| 003 Driver Auth + RLS | <span style="color:#16a34a"><strong>VALIDATED</strong></span> | Use Supabase Auth user per driver | Lock V1 auth pattern |
| 004 IndexedDB Buffer/Flush | <span style="color:#16a34a"><strong>VALIDATED</strong></span> | Use IndexedDB stop-event queue | Lock offline stop-log queue pattern |
| 005 Map Tiles | <span style="color:#f59e0b"><strong>PARTIAL</strong></span> | OpenFreeMap default + swappable config | Proceed with OpenFreeMap, complete device field checks |
| 006 Schedule ETA | <span style="color:#16a34a"><strong>VALIDATED</strong></span> | Schedule + observed delay | Lock V1 ETA formula and confidence states |
| 007 PWA Permissions UX | <span style="color:#16a34a"><strong>VALIDATED</strong></span> | Explicit preflight + recovery UX | Implement driver permission gate and recovery flow |

## Final architecture call (MVP)

Use this as the default MVP architecture:

1. Driver auth/security
- Supabase Auth user per driver (internal alias + PIN/password UX)
- RLS bound to `auth.uid()` + active assignment checks

2. Live ops transport split
- GPS positions: Supabase Realtime Broadcast (ephemeral)
- Stop logs/business records: Postgres + Realtime Postgres Changes (durable)

3. Driver offline resilience
- IndexedDB queue for stop events
- Ordered replay + idempotency keys
- Explicit queued/flushing/synced/failed UI states

4. Mapping
- MapLibre renderer
- OpenFreeMap default provider
- Provider-swappable style config from day one

5. Rider ETA
- Schedule-based ETA + observed delay from latest confirmed stop
- Confidence states (`schedule_only`, `predicted`, `predicted_low_confidence`, `service_ended`)

6. Permissions UX
- Driver preflight gate before tracking start
- Clear denied-permission blocked state + recovery steps

## What is still open

| Open item | Why it matters | Priority |
|---|---|---|
| 001 tablet/Fully Kiosk long-run validation | Can still kill web-only driver tracking if unstable | P0 |
| 002 tablet/mobile reconnect behavior | Confirms realtime behavior under actual field network constraints | P0 |
| 005 tablet/mobile map performance + reliability | Confirms tile/provider behavior in target runtime | P0 |
| 007 iOS/Android permission UX differences | Ensures supportable recovery flow across real devices | P1 |

## Go/No-Go gate for MVP build

Go build production MVP now with the validated patterns above, but treat launch readiness as blocked until these field checks are complete:
- 001: tablet wake lock + geolocation continuity over shift-like duration
- 002: realtime reconnect behavior on target driver/rider devices
- 005: map loading/performance in target region on tablet/mobile

## Recommended next step sequence

1. Run a single integrated tablet field test session covering 001 + 002 + 005 + 007.
2. Capture/export logs from each prototype run.
3. Update each spike report from PENDING/PARTIAL to VALIDATED (or invalidate with pivot decision).
4. Start production implementation with locked modules:
   - `auth/driver-auth`
   - `realtime/position-broadcast`
   - `driver/offline-queue`
   - `map/provider-config`
   - `eta/schedule-delay-engine`
   - `driver/permission-gate`

## Source reports

- `docs/spikes/2026-05-26-wakelock-kiosk.md`
- `docs/spikes/2026-05-26-supabase-realtime-split.md`
- `docs/spikes/2026-05-26-driver-auth-rls.md`
- `docs/spikes/2026-05-26-indexeddb-buffer-flush.md`
- `docs/spikes/2026-05-27-map-tiles.md`
- `docs/spikes/2026-05-27-schedule-eta.md`
- `docs/spikes/2026-05-27-pwa-permissions.md`
