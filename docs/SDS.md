# System Design Specification

Date: 2026-05-22

## 1. Architecture stance

Use Supabase as the managed backend boundary: Postgres, Auth, RLS, Realtime Broadcast, and Postgres Changes. Avoid a bespoke backend unless a spike proves Supabase cannot support a required workflow.

Use one React + Vite PWA with route-based role surfaces:
- `/` rider code gate and map
- `/driver` driver tablet UI
- `/admin` owner dashboard

## 2. Core entities

- routes
  - id UUID primary key
  - name text
  - active boolean
  - service_window_start time
  - service_window_end time
  - created_at timestamptz

- stops
  - id UUID primary key
  - route_id UUID foreign key routes.id
  - name text
  - sequence integer
  - scheduled_time time
  - lat double precision
  - lng double precision
  - active boolean

- buses
  - id UUID primary key
  - label text
  - route_id UUID nullable foreign key routes.id
  - status text enum: in_service, off_service, offline
  - driver_id UUID nullable foreign key drivers.id
  - created_at timestamptz

- drivers
  - id UUID primary key
  - name text
  - auth_user_id UUID nullable foreign key auth.users.id
  - pin_hash text nullable if not using Supabase password
  - active boolean

- daily_codes
  - id UUID primary key
  - code text unique per date/route
  - valid_date date
  - route_id UUID foreign key routes.id
  - starts_at timestamptz
  - expires_at timestamptz
  - created_by UUID nullable foreign key auth.users.id

- stop_logs
  - id UUID primary key
  - bus_id UUID foreign key buses.id
  - stop_id UUID foreign key stops.id
  - route_id UUID foreign key routes.id
  - driver_id UUID nullable foreign key drivers.id
  - service_date date
  - arrived_at timestamptz
  - confirmed_at timestamptz nullable
  - boarded integer default 0
  - alighted integer default 0
  - notes text nullable
  - created_at timestamptz

- bus_position_snapshots optional
  - bus_id UUID primary key foreign key buses.id
  - route_id UUID foreign key routes.id
  - lat double precision
  - lng double precision
  - heading double precision nullable
  - speed double precision nullable
  - recorded_at timestamptz

## 3. Data flow

### Rider access

1. Rider opens QR URL.
2. Rider enters daily code.
3. Frontend calls `validate_daily_code(code)` RPC.
4. RPC returns route summary, stops, service window, and realtime channel token/scope if valid.
5. Frontend subscribes to `route:{route_id}:positions` broadcast channel.
6. Frontend renders MapLibre map and stop/ETA panel.

### Driver tracking

1. Driver opens `/driver` in Fully Kiosk Browser.
2. Driver authenticates with selected pattern from spike.
3. Driver confirms assigned bus/route.
4. Browser requests geolocation and wake lock.
5. Every 3-5 seconds, frontend broadcasts bus position to route channel.
6. Optional: frontend upserts latest snapshot every 15-30 seconds, not every ping.

### Stop logging

1. Driver taps Arrived for a stop.
2. Frontend inserts stop_logs row with service_date, arrived_at, boarded=0, alighted=0.
3. Driver adjusts counts.
4. Frontend updates same row with counts and confirmed_at.
5. Admin dashboard listens to Postgres Changes on stop_logs.

## 4. Supabase Realtime channels

- `route:{route_id}:positions`
  - ephemeral broadcast only
  - payload: bus_id, route_id, lat, lng, heading, speed, recorded_at
  - subscribers: validated rider sessions, admin, relevant driver session

- Postgres Changes
  - stop_logs inserts/updates for admin dashboard
  - buses status changes for admin/driver

## 5. RLS posture

### Rider

- No direct table access by default.
- Access through `validate_daily_code` RPC and public read views with code/session guard.
- No insert/update/delete.

### Driver

- Authenticated lightweight user.
- Can read own driver record and assigned bus/route/stops.
- Can insert/update stop_logs only for own assigned bus/route.
- Can update own bus status.
- Cannot read admin metrics across all buses beyond what driver UI needs.

### Admin

- Supabase Auth email/password.
- Full CRUD on operational tables.
- Can generate daily codes.
- Can read aggregate metrics.

## 6. Frontend structure

Recommended initial structure:

```text
src/
  app/
    App.tsx
    routes.tsx
  features/
    rider/
      RiderCodeGate.tsx
      RiderMapPage.tsx
      eta.ts
    driver/
      DriverLoginPage.tsx
      DriverConsolePage.tsx
      geolocation.ts
      offlineQueue.ts
      wakeLock.ts
    admin/
      AdminDashboard.tsx
      RouteAdmin.tsx
      DriverAdmin.tsx
      DailyCodeAdmin.tsx
  lib/
    supabase.ts
    realtime.ts
    map.ts
    time.ts
  types/
    database.ts
    domain.ts
supabase/
  migrations/
  seed.sql
```

## 7. Key technical decisions to validate

- Tile provider: OpenFreeMap vs Protomaps vs MapTiler.
- Driver auth pattern inside Supabase.
- Wake Lock + Fully Kiosk + geolocation reliability.
- Broadcast reconnect behavior.
- IndexedDB queue/replay semantics.
- Schedule-based ETA formula and edge cases.
