# Architecture

Date: 2026-05-22

## 1. System overview

```text
+----------------+      +--------------------+      +--------------------+
| Rider Browser  | ---> | React/Vite PWA     | ---> | Supabase RPC/Views |
| QR + Code      |      | /                  |      | Code validation    |
+----------------+      +---------+----------+      +---------+----------+
                              |                           |
                              v                           v
                       MapLibre GL JS              Postgres tables
                              ^                    routes/stops/codes
                              |
                      Tile Provider
```

```text
+----------------+      realtime broadcast       +----------------+
| Driver Tablet  | ----------------------------> | Rider/Admin UI |
| /driver        |   route:{route_id}:positions  | live marker    |
+-------+--------+                               +----------------+
        |
        | insert/update stop_logs
        v
+----------------+
| Supabase DB    |
| Postgres/RLS   |
+-------+--------+
        |
        | Postgres Changes
        v
+----------------+
| Admin UI       |
| /admin         |
+----------------+
```

## 2. Why split GPS and stop logs

Live GPS position is ephemeral UI state. Stop arrivals/counts are business records.

Therefore:
- GPS: Supabase Realtime Broadcast, no per-ping database writes.
- Stop logs: Postgres table, append/update event facts.

This keeps the database small, avoids write amplification, and gives the owner reliable metrics.

## 3. State machines

### Bus status

```text
offline -> off_service -> in_service -> off_service -> offline
             ^               |
             +---------------+
```

Meanings:
- offline: no active tablet/session.
- off_service: known bus, not operating route.
- in_service: actively serving assigned route.

### Stop log lifecycle

```text
not_visited -> arrived_created -> confirmed
                   |
                   v
             queued_offline -> flushed -> confirmed
```

Rules:
- Arrived creates a row even when no one boards/alights.
- Confirm finalizes counts.
- Offline queue preserves stop event order.

### Rider access

```text
opened -> code_required -> validating -> authorized -> map_live
                         |              |
                         v              v
                    invalid/expired   service_inactive
```

## 4. ETA algorithm

Inputs:
- ordered stops with scheduled_time.
- latest confirmed stop_log for bus.
- current time.

Algorithm:
1. Find latest confirmed stop for bus on service_date.
2. Compute observed delay = arrived_at time - scheduled_time for that stop.
3. Find next stop by sequence.
4. ETA timestamp = next_stop.scheduled_time + observed delay.
5. ETA minutes = ETA timestamp - now.

Edge rules:
- If no confirmed stop, use raw schedule.
- If bus is ahead of schedule, show early/on-time wording rather than negative confusion.
- If a stop is skipped, admin/driver workflow needs explicit skipped state in future; V1 may infer from later confirmed stop.

## 5. Data ownership boundaries

- Supabase owns persistence, auth, RLS, realtime transport.
- React app owns UI state, map rendering, geolocation, and local offline queue.
- Driver tablet provisioning is part of the product, not an external afterthought.

## 6. Future extension points

- Multiple routes: already handled via route_id.
- More buses: add bus rows.
- Better offline: expand IndexedDB queue and reconciliation.
- Better tiles: switch MapLibre style/provider config.
- Better analytics: add views/materialized views over stop_logs.
