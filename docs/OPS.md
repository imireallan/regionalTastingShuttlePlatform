# Operations Guide

Date: 2026-05-22

## 1. Deployment architecture

- Frontend PWA: Vercel or Netlify.
- Backend/data/realtime/auth: Supabase managed project.
- Maps: selected tile provider from spike.
- Driver runtime: provisioned Android tablet with Fully Kiosk Browser.

## 2. Environments

Use two environments:
- dev: development and preview testing.
- prod: live operations.

Avoid staging unless operational complexity justifies it.

## 3. Secrets

Frontend may only receive:
- Supabase URL.
- Supabase anon key.

Never expose:
- Supabase service role key.
- Admin private credentials.
- Tile provider secret tokens if provider supports domain-restricted public keys instead.

## 4. Monitoring

Minimum launch monitoring:
- Frontend uptime/deployment status.
- Supabase project health.
- Realtime connection errors in frontend logs.
- Stop_log insert failures.
- Driver offline/no-position alert after N minutes.
- Daily backup status.

Useful admin dashboard warnings:
- Bus has not sent position in 2+ minutes.
- Driver has not logged expected stop arrival.
- Code not generated for today.
- Route has no active buses.

## 5. Backups and retention

- Enable Supabase daily backups for prod.
- Retain stop_logs indefinitely unless owner requests retention limit.
- Do not retain high-frequency GPS history in V1.
- If using bus_position_snapshots, store only last known row per bus.

## 6. Launch runbook

Before service day:
- Confirm today daily code exists.
- Confirm route stops and schedule.
- Confirm buses assigned to route.
- Confirm tablets charged and mounted.
- Confirm Fully Kiosk launches `/driver`.
- Confirm geolocation permission granted.
- Confirm each bus appears on admin map.

During service:
- Monitor admin dashboard.
- If bus disappears, call driver and check tablet power/screen/network.
- If stop logs are missing, ask driver to continue using Arrived/Confirm; reconcile manually if needed.

After service:
- Export daily stop logs.
- Review ridership totals.
- Review missing stops or late arrivals.
- Record operational issues for next iteration.

## 7. Incident response

### Rider map unavailable

Fallback:
- Owner communicates manual shuttle schedule/phone number.
- Admin checks frontend deployment, Supabase status, tile provider status.

### Bus not visible

Fallback:
- Driver confirms tablet is awake, charging, and on `/driver`.
- Driver reloads kiosk page.
- Admin verifies bus status.

### Stop counts wrong

Fallback:
- Use stop_logs as best available facts.
- Admin can add correction note or adjusted row if required by future feature.

## 8. Scaling

Expected V1 scale is tiny: 2-4 buses. The design should still avoid bad patterns:
- No GPS write per ping.
- Route_id on all operational records.
- Configurable routes/stops/buses.
- RLS policies built before launch, not patched after.
