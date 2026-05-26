# Spike 002: Supabase Realtime Split

<table>
  <tr>
    <td><strong>Status</strong></td>
    <td><span style="color:#f59e0b"><strong>PARTIAL — DESKTOP REALTIME SPLIT VALIDATED</strong></span></td>
  </tr>
  <tr>
    <td><strong>Risk level</strong></td>
    <td><span style="color:#f59e0b"><strong>Medium</strong></span> — tablet/mobile network behavior still pending</td>
  </tr>
  <tr>
    <td><strong>Architecture signal</strong></td>
    <td><span style="color:#16a34a"><strong>Positive</strong></span> — Broadcast + Postgres Changes split works on desktop</td>
  </tr>
</table>

## Executive summary

| Item | Result |
|---|---|
| Broadcast GPS path | <span style="color:#16a34a"><strong>Working on desktop</strong></span> |
| Postgres Changes stop-log path | <span style="color:#16a34a"><strong>Working</strong></span> |
| Wi-Fi offline/online reconnect | <span style="color:#16a34a"><strong>Almost immediate</strong></span> |
| Manual resubscription after Wi-Fi toggle | <span style="color:#16a34a"><strong>Not required</strong></span> |
| Manual resubscription after closing tab | <span style="color:#f59e0b"><strong>Required / expected</strong></span> |
| Sent count vs received count while offline | <span style="color:#f59e0b"><strong>Mismatch observed / expected</strong></span> |
| Tablet/mobile network test | <span style="color:#dc2626"><strong>Pending</strong></span> |

## Question

Can Supabase Realtime Broadcast handle ephemeral GPS positions while Postgres Changes handles durable `stop_logs` updates for rider/admin live operations?

## Why this matters

The MVP architecture depends on splitting high-frequency, disposable GPS state from durable business records. If this fails, we either write too much GPS data to Postgres, add a custom realtime backend, or change the live map freshness expectation.

## Prototype

| Field | Details |
|---|---|
| Prototype path | `prototypes/spikes/002-supabase-realtime-split/index.html` |
| Run URL | `http://localhost:4173/002-supabase-realtime-split/` |
| Evidence output | Exportable JSON event logs |
| Supabase key type | Browser-safe publishable/anon key only |

Prototype capabilities:

| Capability | Purpose |
|---|---|
| Driver broadcaster | Emits fake positions for 1, 2, or 4 buses every 3 or 5 seconds. |
| Rider/admin subscriber | Listens on `route:{route_id}:positions`. |
| Latest position table | Shows current position per bus. |
| Latency measurement | Measures receive latency from `sent_at`. |
| Stop-log listener | Uses `postgres_changes` on `public.stop_logs`. |
| Insert helper | Optional RPC `spike_insert_stop_log`. |
| Event export | Saves JSON evidence logs. |

## Test setup

| Dimension | Value |
|---|---|
| Device/browser | Local desktop browser test |
| Supabase project | Test project connected with browser-safe publishable/anon key |
| Region | Fake demo coordinates from shared sample route |
| Network | Local static server with Wi-Fi toggled offline/online |
| Test data | Fake moving bus payloads generated in browser |

## Pressure-test results

| Test area | Expected | Observed | Status |
|---|---|---|---|
| Prototype load | Page opens locally | HTTP 200, smoke test passed | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Broadcast GPS | Subscriber receives live positions | Working on desktop | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Wi-Fi offline/online reconnect | Reconnect without manual user action | Reconnection appeared almost immediate | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Manual resubscribe during Wi-Fi toggle | Should not be needed | Not needed | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Closing subscription tab | New tab must subscribe again | Manual resubscription required | <span style="color:#16a34a"><strong>Expected</strong></span> |
| Offline event behavior | GPS Broadcast may drop messages | Sent count exceeded received count during offline periods | <span style="color:#f59e0b"><strong>Expected constraint</strong></span> |
| Durable stop-log listener | Stop-log insert fires separate event | `stop_logs` Postgres Changes listener fired | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Tablet/mobile network | Same behavior on target runtime | Not tested yet | <span style="color:#f59e0b"><strong>Pending</strong></span> |

## Findings

| Finding | Interpretation |
|---|---|
| Event logs were exported from the 002 prototype. | Evidence capture path works. |
| Reconnection after Wi-Fi offline/online appeared almost immediate. | Desktop reconnect behavior is promising. |
| Manual resubscription was only needed after closing the subscription tab. | Expected; a new tab has no previous channel subscription. |
| Manual resubscription was not needed for Wi-Fi offline/online toggling. | Good signal for operational resilience. |
| Broadcaster event log kept streaming local send events while offline. | Local code continues attempting sends; network delivery is not guaranteed. |
| Sent count became higher than received count during Wi-Fi toggling. | Expected for ephemeral Broadcast; GPS pings are not durable queue items. |
| Separate `stop_logs` Postgres Changes listener fired successfully. | Confirms GPS and durable stop events can use separate realtime paths. |

Smoke test evidence:

```text
http://localhost:4173/002-supabase-realtime-split/
HTTP 200
prototype 002 smoke test passed
```

## Architecture interpretation

| Principle | Spike evidence |
|---|---|
| GPS is ephemeral UI state | Broadcast can drop messages during offline periods; this is acceptable if UI shows stale/last-seen state. |
| Stop logs are durable business records | Postgres Changes fired separately when a stop log was inserted. |
| Database should not receive every GPS ping | Broadcast path is separate from Postgres writes. |
| Rider/admin UI needs stale state | Sent > received can happen by design during network disruption. |

## Decision

<span style="color:#f59e0b"><strong>PARTIAL — DESKTOP REALTIME SPLIT VALIDATED; TABLET/MOBILE NETWORK BEHAVIOR STILL PENDING</strong></span>

## Recommendation

Use this architecture for the MVP unless tablet/mobile testing invalidates it:

| Production choice | Recommendation |
|---|---|
| Live GPS transport | Supabase Broadcast channel `route:{route_id}:positions` |
| Durable stop events | Postgres `stop_logs` + Realtime Postgres Changes |
| Initial map state | Consider low-frequency `bus_position_snapshots` for last-known-position |
| Offline GPS behavior | Do not replay stale GPS as current position |
| Rider/admin UI | Show last seen time, stale marker state, and disconnected state |

## Implementation impact

| Area | Likely module/schema impact |
|---|---|
| Position broadcast | `src/realtime/positionBroadcast.ts` |
| Stop-log subscription | `src/realtime/stopLogSubscription.ts` |
| Driver GPS publisher | `src/features/driver/locationPublisher.ts` |
| Rider live bus store | `src/features/rider/liveBusStore.ts` |
| Supabase config | Realtime publication config for `stop_logs` |
| Optional snapshot | `bus_position_snapshots` table/RPC if initial map blank state is unacceptable |

## Risks remaining

| Risk | Status |
|---|---|
| Tablet/mobile network behavior not tested | <span style="color:#dc2626"><strong>Open</strong></span> |
| Latency range/average not summarized from exported logs | <span style="color:#f59e0b"><strong>Open</strong></span> |
| RLS/private-channel design not tested here | <span style="color:#f59e0b"><strong>Separate spike</strong></span> |
| UI stale-position design required | <span style="color:#f59e0b"><strong>Must implement</strong></span> |
