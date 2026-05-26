# Spike 004: IndexedDB Buffer/Flush

## Question

What is the minimum offline queue that prevents losing driver stop taps during short signal drops?

## Kill question

If stop arrival/confirmation events are lost after refresh, replay out of order, create duplicate durable records, or leave the driver unsure whether a stop was synced, the V1 offline strategy is not acceptable.

## Prototype

A standalone browser page that simulates the driver stop workflow:

- Arrived button
- boarded/alighted counters
- Confirm button
- simulated offline/online toggle
- IndexedDB-backed durable event queue
- queue status table
- flush-in-order behavior
- duplicate-tap/idempotency-key behavior
- partial flush failure simulation
- latest GPS only behavior so stale GPS is not replayed as current

## Run locally

From repo root:

```bash
python3 -m http.server 4173 --directory prototypes/spikes
```

Open:

```text
http://localhost:4173/004-indexeddb-buffer-flush/
```

## Pressure tests

1. Click `Go offline`.
2. Click `Arrived`.
3. Change boarded/alighted counters.
4. Click `Confirm`.
5. Refresh the browser page while still offline.
6. Confirm queued events are still present.
7. Click `Go online`.
8. Click `Flush queue`.
9. Confirm events flush in order.
10. Repeat with `Fail next flush` enabled to verify failed event stays queued.
11. Click `Duplicate confirm` and confirm same idempotency key does not create duplicate synced records.
12. Send GPS while offline, wait past TTL, then go online and confirm stale GPS is dropped rather than replayed.

## Expected MVP direction if validated

- Persist stop events in IndexedDB with client-generated idempotency keys.
- Flush stop events in order.
- Keep failed events visible and retryable.
- Do not replay stale GPS as current position.
- Show clear driver state: queued, flushing, synced, failed.
