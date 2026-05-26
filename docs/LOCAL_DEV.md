# Local Development Guide

Date: 2026-05-22

## 1. Prerequisites

- Node.js 20+
- pnpm or npm
- Supabase CLI
- Git
- Modern browser with geolocation support

Recommended package manager: pnpm.

## 2. Expected repo structure

```text
RegionalTastingShuttlePlatform/
  docs/
  src/
  public/
  supabase/
    migrations/
    seed.sql
  package.json
  vite.config.ts
  .env.example
```

## 3. Environment variables

Create `.env.local` from `.env.example` once app scaffold exists.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_ENV=local
```

Admin-only service role keys must never be exposed to the frontend.

## 4. Supabase local workflow

Expected commands after Supabase is initialized:

```bash
supabase start
supabase db reset
supabase gen types typescript --local > src/types/database.ts
```

Migration rules:
- All schema changes go through `supabase/migrations`.
- RLS policies are version-controlled with schema.
- Seed data should include one route, stops, two buses, one admin, one driver.

## 5. Frontend workflow

Expected commands after React/Vite scaffold exists:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 6. Development test data

Minimum local seed:
- Route: Primary loop
- Stops: 4-6 realistic stops with lat/lng and scheduled_time
- Buses: Bus 1, Bus 2
- Driver: Test Driver with PIN
- Daily code: valid today

## 7. Geolocation development notes

Browser geolocation requires secure context except localhost.

For local testing:
- `localhost` is acceptable.
- Use browser devtools sensors to simulate movement.
- For tablet testing, deploy preview over HTTPS and open in Fully Kiosk.

## 8. Map development notes

Never use production traffic against `tile.openstreetmap.org`.
Use selected provider from tile spike.

MapLibre styles should live in `src/lib/map.ts` or config data, not scattered through components.

## 9. Debugging checklist

If rider map is blank:
- Check code validation response.
- Check route has active stops with lat/lng.
- Check tile provider URL/style.
- Check Realtime channel subscription.
- Check whether last-known-position snapshot exists.

If driver position is not updating:
- Check geolocation permission.
- Check Wake Lock status.
- Check Supabase Realtime connection.
- Check route_id and bus_id in payload.
- Check Fully Kiosk foreground/sleep settings.

If stop logs are not saved:
- Check driver auth session.
- Check RLS policy for assigned bus.
- Check offline queue state.
- Check service_date timezone handling.
