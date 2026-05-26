# Testing Strategy

Date: 2026-05-22

## 1. Testing goals

The risky parts are not generic UI. The risky parts are realtime behavior, RLS, tablet geolocation, and stop-log data integrity. Tests should focus there.

## 2. Test layers

### Unit tests

Use for pure logic:
- ETA calculation.
- service_date derivation.
- code expiry checks.
- offline queue ordering.
- passenger count validation.

### Integration tests

Use for Supabase-backed workflows:
- daily code validation RPC.
- RLS policies by role.
- driver stop_log insert/update.
- admin CRUD.
- dashboard aggregate queries.

### E2E tests

Use for critical user flows:
- rider valid/invalid code.
- rider map loads with simulated marker.
- driver arrival/count/confirm flow.
- admin generates code and sees dashboard update.

### Manual/device tests

Required for:
- Fully Kiosk setup.
- Wake Lock behavior.
- Android geolocation across full shift.
- PWA installation.

## 3. Critical acceptance test matrix

### Rider

- Valid code grants access.
- Invalid code blocks access.
- Expired code blocks access.
- Active bus marker updates from broadcast.
- No bus shows clear inactive/offline state.
- ETA handles no prior stop log.

### Driver

- Login fails with wrong PIN.
- Login succeeds with active driver.
- Driver only sees assigned bus/route.
- Arrived creates stop_log with zero counts.
- Confirm updates counts and confirmed_at.
- Offline stop tap queues and flushes.
- GPS permission denied shows recovery instructions.

### Admin

- Admin can create route/stop/bus/driver.
- Admin can generate daily code.
- Admin can assign bus to route.
- Admin sees stop_log changes live.
- Admin can export daily logs.

### Security/RLS

- Rider cannot query raw stop_logs.
- Rider cannot write anything.
- Driver cannot write logs for another bus.
- Driver cannot read admin-only aggregates unless exposed through allowed view.
- Admin can manage all operational data.

## 4. CI expectation

Once scaffolded, CI should run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If E2E is added:

```bash
pnpm e2e
```

## 5. Test data rules

- Use fixed UUIDs in integration tests.
- Use deterministic local dates/times.
- Avoid relying on actual current time except in thin wrappers.
- Mock geolocation in browser tests.
- Mock Realtime where possible; use a real Supabase local instance for policy tests.

## 6. Definition of done

A feature is done only when:
- Unit/integration tests cover expected and failure states.
- RLS behavior is tested for unauthorized access.
- UI has useful empty/loading/error states.
- Manual tablet behavior is documented if it touches driver tracking.
