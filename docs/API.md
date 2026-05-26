# API and Client Contract

Date: 2026-05-22

This project should avoid a custom HTTP API unless necessary. The API boundary is Supabase: RPC functions, table policies, realtime broadcast, and typed frontend service wrappers.

## 1. Supabase RPCs

### validate_daily_code

Purpose: Validate rider access code and return route bootstrap data.

Input:

```json
{ "code": "123456" }
```

Success response:

```json
{
  "valid": true,
  "route": {
    "id": "uuid",
    "name": "Primary loop",
    "serviceWindowStart": "10:00",
    "serviceWindowEnd": "18:00"
  },
  "stops": [
    { "id": "uuid", "name": "Winery A", "sequence": 1, "scheduledTime": "10:15", "lat": 0, "lng": 0 }
  ],
  "realtimeChannel": "route:uuid:positions"
}
```

Failure response:

```json
{ "valid": false, "reason": "expired_or_invalid" }
```

### generate_daily_code

Admin only.

Input:

```json
{ "route_id": "uuid", "valid_date": "2026-05-22" }
```

Response:

```json
{ "code": "428193", "expires_at": "2026-05-22T18:00:00-07:00" }
```

### driver_login

Final shape depends on spike result.

Option A: Supabase Auth with generated email alias and PIN as password.
Option B: custom RPC verifies name + PIN and returns scoped session/claim pattern.

Recommended contract for frontend regardless of implementation:

```json
{ "driver_name": "Sam", "pin": "1234" }
```

Response:

```json
{
  "driver": { "id": "uuid", "name": "Sam" },
  "bus": { "id": "uuid", "label": "Bus 1", "routeId": "uuid" },
  "route": { "id": "uuid", "name": "Primary loop" }
}
```

## 2. Realtime broadcast contracts

### Position broadcast

Channel:

```text
route:{route_id}:positions
```

Event:

```text
bus_position
```

Payload:

```json
{
  "busId": "uuid",
  "routeId": "uuid",
  "lat": 38.0,
  "lng": -122.0,
  "heading": 180,
  "speed": 8.5,
  "accuracy": 12,
  "recordedAt": "2026-05-22T10:05:00Z"
}
```

Rules:
- Broadcast every 3-5 seconds while driver is active.
- Do not insert every GPS ping into Postgres.
- On reconnect, resume latest position; do not replay stale GPS pings to riders.

## 3. Stop log table contract

Driver creates row on arrival:

```json
{
  "bus_id": "uuid",
  "stop_id": "uuid",
  "route_id": "uuid",
  "driver_id": "uuid",
  "service_date": "2026-05-22",
  "arrived_at": "2026-05-22T10:15:00Z",
  "boarded": 0,
  "alighted": 0
}
```

Driver updates counts and confirmation:

```json
{
  "boarded": 4,
  "alighted": 1,
  "confirmed_at": "2026-05-22T10:15:30Z"
}
```

## 4. Frontend service wrappers

Do not scatter raw Supabase calls across components. Create wrappers:

- `validateDailyCode(code)`
- `subscribeToRoutePositions(routeId, handler)`
- `broadcastBusPosition(position)`
- `createStopArrival(input)`
- `confirmStopLog(logId, counts)`
- `generateDailyCode(routeId, date)`
- `listDailyMetrics(date)`

## 5. Error handling contract

All user-facing errors should map to these categories:

- invalid_code
- expired_code
- service_inactive
- location_permission_denied
- offline_queued
- offline_failed
- auth_failed
- unauthorized
- unknown

UI should show plain-language recovery instructions, not raw Supabase errors.
