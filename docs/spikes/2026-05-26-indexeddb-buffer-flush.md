# Spike 004: IndexedDB Buffer/Flush

<table>
  <tr>
    <td><strong>Status</strong></td>
    <td><span style="color:#16a34a"><strong>VALIDATED — USE INDEXEDDB STOP-EVENT QUEUE FOR V1</strong></span></td>
  </tr>
  <tr>
    <td><strong>Risk level</strong></td>
    <td><span style="color:#16a34a"><strong>Reduced</strong></span> — critical stop-log offline behavior passed desktop pressure test</td>
  </tr>
  <tr>
    <td><strong>Architecture signal</strong></td>
    <td><span style="color:#16a34a"><strong>Positive</strong></span> — IndexedDB can preserve stop events while stale GPS is not replayed</td>
  </tr>
</table>

## Executive summary

| Item | Result |
|---|---|
| Browser prototype created | <span style="color:#16a34a"><strong>Yes</strong></span> |
| IndexedDB durable stop queue | <span style="color:#16a34a"><strong>Validated</strong></span> |
| Offline simulation | <span style="color:#16a34a"><strong>Validated</strong></span> |
| Refresh survival test | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Ordered flush | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Duplicate/idempotency behavior | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Partial flush failure | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Stale GPS not replayed | <span style="color:#16a34a"><strong>Pass</strong></span> |

## Question

What is the minimum offline queue that prevents losing stop taps during short signal drops?

## Why this matters

Live GPS can be ephemeral, but stop arrival/count events are business records. If a driver taps Arrived/Confirm during a dead zone and those events are lost, the owner loses operational truth and daily totals become unreliable.

## What this spike tests

| Test focus | What we need to learn |
|---|---|
| Offline stop queue | Whether Arrived/Confirm taps are durably stored while offline. |
| Refresh survival | Whether queued stop events remain after a page reload. |
| Ordered flush | Whether events replay oldest-first when connectivity returns. |
| Idempotency | Whether duplicate confirm taps can be skipped using a client-generated key. |
| Partial failure handling | Whether failed flushes remain visible and retryable instead of silently disappearing. |
| GPS replay policy | Whether stale GPS is dropped instead of replayed as current location. |

## Prototype

| Field | Details |
|---|---|
| Prototype path | `prototypes/spikes/004-indexeddb-buffer-flush/index.html` |
| Run URL | `http://localhost:4173/004-indexeddb-buffer-flush/` |
| Storage | Browser IndexedDB database `rts-spike-004-indexeddb` |
| Evidence output | Exportable JSON event logs |

Prototype capabilities:

| Capability | Purpose |
|---|---|
| Arrived button | Creates a queued stop-arrival event. |
| Boarded/alighted counters | Captures driver passenger counts. |
| Confirm button | Creates a queued confirmation event. |
| Simulated offline/online | Deterministic pressure test without changing actual Wi-Fi. |
| IndexedDB event queue | Persists events across refresh. |
| Flush queue | Replays stop events oldest-first. |
| Idempotency key | Prevents duplicate durable records for repeated confirm taps. |
| Fail next flush | Simulates partial server/API failure. |
| Latest GPS with TTL | Drops stale GPS instead of replaying it as current. |

## Test setup

| Dimension | Current value |
|---|---|
| Device/browser | Local desktop browser prototype |
| Supabase project | Not required; server writes are simulated |
| Network | Simulated offline/online inside prototype |
| Test data | Demo route stops and generated driver events |

## Pressure-test results

| Test area | Expected result | Observed | Status |
|---|---|---|---|
| Offline stop queue | Events appear as queued | Arrived/Confirm events were queued while offline | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Refresh survival | Queued events remain in IndexedDB after reload | Queue survived browser refresh | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Ordered flush | Events sync oldest-first | Flush order behaved as expected | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Duplicate confirm | Duplicate idempotency key is skipped | Duplicate confirm did not create duplicate durable record | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Partial flush failure | Failed event remains visible/retryable | Simulated failed flush stayed visible and retryable | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Stale GPS | Stale GPS is dropped, not replayed | Latest GPS TTL behavior confirmed | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Evidence export | JSON event logs can be exported | Event logs exported successfully | <span style="color:#16a34a"><strong>Pass</strong></span> |

## Findings

| Finding | Interpretation |
|---|---|
| Event logs were exported from the 004 prototype. | Evidence capture path works. |
| Stop events persisted in IndexedDB while offline. | Stop taps can survive short signal drops. |
| Queue survived browser refresh. | IndexedDB is suitable for preserving unsynced stop events across reloads. |
| Stop events flushed in order. | Production should replay oldest-first to preserve operational sequence. |
| Duplicate confirm was skipped by idempotency key. | Production should add a client event ID/idempotency key with a unique constraint server-side. |
| Partial flush failure stayed visible/retryable. | Driver UI should clearly show failed sync state and retry path. |
| Stale GPS was dropped instead of replayed. | GPS should remain latest-only or short-TTL, not durable replay. |
| Expected MVP direction confirmed. | Use IndexedDB stop-event queue for V1 with clear sync states. |

Smoke test evidence:

```text
http://localhost:4173/004-indexeddb-buffer-flush/
HTTP 200
prototype 004 smoke test passed
```

## Decision

<span style="color:#16a34a"><strong>VALIDATED — USE INDEXEDDB STOP-EVENT QUEUE FOR V1</strong></span>

## Recommendation

| Production choice | Recommendation |
|---|---|
| Stop taps | Persist in IndexedDB until flushed. |
| Flush order | Oldest-first. |
| Idempotency | Use client-generated idempotency keys. |
| Failed writes | Keep visible and retryable. |
| GPS | Store only latest GPS or short-TTL queue; never replay stale GPS as current. |
| Driver UI | Show queued, flushing, synced, and failed states clearly. |

## Implementation impact

| Area | Likely module/schema impact |
|---|---|
| Offline queue | `src/features/driver/offlineQueue.ts` |
| Driver stop UI | Arrived/Confirm buttons need explicit sync state. |
| Stop logs schema | Add idempotency key / unique constraint for client event ID. |
| Flush worker | Retry/backoff and ordered replay logic. |
| GPS publisher | Latest-only or short-TTL semantics. |
| Driver UX | Offline banner: “Offline but saving stop taps.” |

## Risks remaining

| Risk | Status |
|---|---|
| Browser/device IndexedDB behavior on Android tablet | <span style="color:#f59e0b"><strong>Pending tablet confirmation</strong></span> |
| Real Supabase insert/RLS integration | <span style="color:#f59e0b"><strong>Future integration test</strong></span> |
| Conflict handling if server already has same idempotency key | <span style="color:#f59e0b"><strong>Implementation detail</strong></span> |
| Long offline period scope | <span style="color:#f59e0b"><strong>Product decision</strong></span> |
