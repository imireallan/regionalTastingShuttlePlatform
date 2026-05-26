# Spike 003: Driver Auth + RLS

## Question

What is the simplest secure driver name/PIN pattern that still allows enforceable Supabase RLS?

## Kill question

If the driver PIN flow cannot be tied to `auth.uid()` or another server-enforced identity boundary, and RLS depends on frontend-provided `driver_id`/`bus_id`, the pattern is unacceptable for MVP.

## Default hypothesis

Use one Supabase Auth user per driver.

Driver UX can still be name/PIN:

- Driver selects their name.
- Driver enters PIN.
- Frontend converts the selected driver to an internal email alias like `driver-alice@regional-shuttle.internal`.
- Supabase Auth signs in with email/password.
- RLS uses `auth.uid()` mapped to `drivers.auth_user_id`.

This avoids building custom auth while keeping RLS enforceable.

## Prototype files

- `schema.sql` — disposable schema, RLS policies, test helper functions.
- `test-plan.md` — manual Supabase Dashboard/Auth/API test steps.

## What this proves

- Authenticated driver can insert stop logs only for their assigned bus/route.
- Driver cannot write another bus's stop log by changing payload fields.
- Deactivated driver cannot write stop logs.
- Admin/service-side setup can rotate/reset PIN by updating the driver's Supabase Auth password.

## What this does not prove yet

- Final admin UI for driver creation/reset.
- Fully polished driver login screen.
- Private Realtime channel authorization.

## Recommended result if validated

Use Supabase Auth user per driver for V1. Keep the driver UI as name/PIN, but make the backend security depend only on Supabase Auth + RLS.
