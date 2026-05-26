# Spike 003: Driver Auth + RLS

<table>
  <tr>
    <td><strong>Status</strong></td>
    <td><span style="color:#16a34a"><strong>VALIDATED — USE SUPABASE AUTH USER PER DRIVER FOR V1</strong></span></td>
  </tr>
  <tr>
    <td><strong>Risk level</strong></td>
    <td><span style="color:#16a34a"><strong>Reduced</strong></span> — core RLS enforcement passed</td>
  </tr>
  <tr>
    <td><strong>Architecture signal</strong></td>
    <td><span style="color:#16a34a"><strong>Positive</strong></span> — name/PIN UX can sit on top of Supabase Auth</td>
  </tr>
</table>

## Executive summary

| Item | Result |
|---|---|
| Driver sign-in with internal alias + PIN/password | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Driver reads own context | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Driver inserts assigned bus/route stop log | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Cross-bus insert blocked | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Spoofed `created_by_driver_id` blocked | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Deactivated driver blocked | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Admin PIN/password reset | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Admin deactivation | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Production decision | <span style="color:#16a34a"><strong>Validated for V1</strong></span> |

## Question

What is the simplest secure driver name/PIN pattern that still allows enforceable Supabase RLS?

## Why this matters

The driver app needs a low-friction tablet login, but stop logs must not rely on trusted frontend fields. If a driver can change `bus_id`, `route_id`, or `driver_id` in the browser and write another bus's records, the MVP security model is invalid.

## What this spike tests

| Test focus | What we need to learn |
|---|---|
| Driver login pattern | Whether name + PIN can map cleanly to Supabase Auth. |
| RLS identity binding | Whether `auth.uid()` can enforce driver ownership through `drivers.auth_user_id`. |
| Assigned-bus enforcement | Whether a driver is blocked from writing another bus's stop logs. |
| Driver spoofing protection | Whether changing `created_by_driver_id` in the client is blocked by RLS. |
| Deactivation behavior | Whether an inactive driver immediately loses write access. |
| Admin operations | Whether PIN reset/rotation and driver deactivation are operationally simple enough for V1. |

## Prototype

| Field | Details |
|---|---|
| Schema prototype | `prototypes/spikes/003-driver-auth-rls/schema.sql` |
| Test plan | `prototypes/spikes/003-driver-auth-rls/test-plan.md` |
| Setup guide | `docs/spikes/2026-05-26-driver-auth-rls-setup-guide.md` |
| Supabase project | Non-production spike project |

Prototype model:

| Model piece | Decision |
|---|---|
| Driver UX | Name + PIN |
| Backend identity | One Supabase Auth user per driver |
| Internal login alias | `driver-name@regional-shuttle.internal` |
| PIN implementation | Supabase Auth password |
| RLS identity source | `auth.uid()` |
| Driver mapping | `drivers.auth_user_id` |
| Active assignment check | Driver must have active assignment for bus/route/service_date |

## Test setup

| Dimension | Value |
|---|---|
| Device/browser | Browser/client test against Supabase |
| Supabase project | Non-production project with spike schema |
| Auth users | Alice/Bob driver users created with internal email aliases |
| Network | Normal browser/API access |
| Test data | One route, two buses, two drivers, two assignments |

## Pressure-test results

| Test area | Expected | Observed | Status |
|---|---|---|---|
| Alice sign-in | Internal alias + PIN/password signs in | Worked | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Read own context | Alice sees only her active assignment | Worked via `spike_my_driver_context` | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Valid stop-log insert | Alice can write assigned bus/route | Insert succeeded | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Cross-bus write | Alice cannot write Bob's bus | Blocked by RLS | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Driver spoofing | Alice cannot set Bob's `created_by_driver_id` | Blocked by RLS | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Deactivated driver | Inactive Alice cannot write stop logs | Blocked | <span style="color:#16a34a"><strong>Pass</strong></span> |
| PIN/password reset | Admin can rotate credentials | Worked through Supabase Auth | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Driver deactivation | Admin can disable driver operationally | Worked via active flag | <span style="color:#16a34a"><strong>Pass</strong></span> |

## Findings

| Finding | Interpretation |
|---|---|
| Happy path passed | Driver can use simple login and write valid stop logs. |
| Cross-bus writes failed | RLS is not trusting frontend `bus_id`. |
| Spoofed driver ID failed | RLS is not trusting frontend `created_by_driver_id`. |
| Deactivated driver failed | Operational deactivation works without deleting records. |
| Admin reset/rotation passed | PIN/password lifecycle is feasible for MVP. |
| No custom backend required for auth | Supabase Auth + RLS is sufficient for V1 driver security. |

## Decision

<span style="color:#16a34a"><strong>VALIDATED — USE SUPABASE AUTH USER PER DRIVER FOR V1</strong></span>

## Recommendation

Use the Supabase Auth user-per-driver model for V1.

| Recommendation | Reason |
|---|---|
| Keep driver UI as name + PIN | Low-friction tablet experience. |
| Use internal email aliases under the hood | Allows standard Supabase Auth without exposing email UX. |
| Map `auth.uid()` to `drivers.auth_user_id` | Gives enforceable RLS identity. |
| Require active assignment in RLS | Prevents cross-bus/route writes. |
| Use `drivers.active` | Enables operational deactivation. |
| Reset PIN through Supabase Auth password reset/admin flow | Avoids custom credential storage for V1. |

Avoid for V1 unless separately proven safe:

| Avoid | Why |
|---|---|
| Frontend-only `driver_id` / `bus_id` trust | Easy to spoof in browser. |
| Custom PIN RPC returning driver context without Auth identity | Harder to secure with RLS. |
| Service-role mediated browser flows | Service role must never be exposed to frontend. |

## Implementation impact

| Area | Production impact |
|---|---|
| `drivers` | Add `auth_user_id`, `active`, internal alias/display name fields. |
| `driver_assignments` | Store active bus/route/service_date assignment. |
| `stop_logs` | Include `created_by_driver_id`; enforce insert/select through RLS. |
| Driver login UI | Name selector maps to internal alias; PIN signs into Supabase Auth. |
| Admin UI | Create driver, reset PIN, deactivate driver. |
| RLS policies | Cross-check `auth.uid()` against active assignment for all driver writes. |

## Risks remaining

| Risk | Status |
|---|---|
| Admin Auth-user creation flow needs implementation choice | <span style="color:#f59e0b"><strong>Open</strong></span> — Supabase admin API, Edge Function, or manual Dashboard for MVP |
| PIN policy needs operational rules | <span style="color:#f59e0b"><strong>Open</strong></span> — minimum length, reset cadence, deactivation process |
| Private Realtime channel authorization | <span style="color:#f59e0b"><strong>Separate concern</strong></span> |
| Production schema/policies must replace spike names | <span style="color:#f59e0b"><strong>Implementation task</strong></span> |
