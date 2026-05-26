# Spike 003 Test Plan: Driver Auth + RLS

## Actors

Create two Supabase Auth users in the Dashboard:

1. Alice Driver
   - internal email: `driver-alice@regional-shuttle.internal`
   - password/PIN for spike: `1111testPIN!`

2. Bob Driver
   - internal email: `driver-bob@regional-shuttle.internal`
   - password/PIN for spike: `2222testPIN!`

The real UI can still show name + PIN. The internal email is implementation detail.

## Expected behavior

Alice assigned to Bus A / Route 1:

- Can read her driver context.
- Can insert stop logs for Bus A / Route 1.
- Cannot insert stop logs for Bus B / Route 1.
- Cannot impersonate Bob by changing `created_by_driver_id`.

Bob assigned to Bus B / Route 1:

- Can insert for Bus B.
- Cannot insert for Bus A.

Deactivated Alice:

- Cannot insert any stop logs.

## Manual test sequence

1. Run `schema.sql` in SQL Editor.
2. Create two Auth users.
3. Copy their Auth user IDs.
4. Insert seed route/bus/driver/assignment rows with those user IDs.
5. Sign into the Supabase API/client as Alice.
6. Query `spike_my_driver_context`.
7. Insert valid Alice stop log.
8. Attempt invalid Alice stop log for Bob's bus.
9. Attempt invalid Alice stop log with Bob's `created_by_driver_id`.
10. Deactivate Alice in `spike_drivers`.
11. Attempt another insert as Alice.
12. Record which operations passed/failed.

## Pass criteria

- Valid assigned stop-log insert succeeds.
- Cross-bus insert fails with RLS violation.
- Driver impersonation fails with RLS violation.
- Deactivated driver insert fails.
- No policy depends on trusting frontend-only fields without checking them against `auth.uid()`.
