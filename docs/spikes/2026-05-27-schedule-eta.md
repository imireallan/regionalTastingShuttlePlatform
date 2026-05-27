# Spike 006: Schedule ETA

<table>
  <tr>
    <td><strong>Status</strong></td>
    <td><span style="color:#16a34a"><strong>VALIDATED — USE SCHEDULE + OBSERVED DELAY FOR V1 ETA</strong></span></td>
  </tr>
  <tr>
    <td><strong>Risk level</strong></td>
    <td><span style="color:#16a34a"><strong>Reduced</strong></span> — key edge cases passed fixture pressure tests</td>
  </tr>
  <tr>
    <td><strong>Architecture signal</strong></td>
    <td><span style="color:#16a34a"><strong>Positive</strong></span> — ETA logic can remain pure/deterministic and independent from map provider</td>
  </tr>
</table>

## Executive summary

| Item | Result |
|---|---|
| Pure ETA function implemented | <span style="color:#16a34a"><strong>Yes</strong></span> |
| Fixture tests implemented | <span style="color:#16a34a"><strong>Yes</strong></span> |
| Pressure tests passed | <span style="color:#16a34a"><strong>8/8</strong></span> |
| No-log fallback | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Late/early delay handling | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Loop rollover + final-stop clamp | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Service-ended behavior | <span style="color:#16a34a"><strong>Pass</strong></span> |

## Question

Can schedule + observed delay from the latest confirmed stop log deliver predictable V1 ETA output across operational edge cases?

## Prototype

| Field | Details |
|---|---|
| Prototype path | `prototypes/spikes/006-schedule-eta/` |
| ETA logic | `calculate-eta.mjs` |
| Test fixtures | `fixtures-and-tests.mjs` |
| Runner | Node.js |

## Pressure-test results

| Test area | Expected | Observed | Status |
|---|---|---|---|
| No prior stop log | Use schedule-only ETA | Returned `schedule_only` with eta=20 min | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Late bus | Add positive observed delay | Returned `predicted`, delay=+7, eta=17 min | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Early bus | Apply negative observed delay | Returned `predicted`, delay=-3, eta=7 min | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Final stop overdue | Clamp ETA to zero | Returned eta=0 | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Loop rollover | Compute forward-in-time schedule delta | Returned eta=605 min for 23:55 -> 10:00 next day | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Invalid latest stop reference | Safe fallback to schedule-only | Returned `schedule_only` fallback | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Multiple buses active | Downgrade confidence | Returned `predicted_low_confidence` | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Service ended | Return no ETA | Returned `service_ended`, eta=null | <span style="color:#16a34a"><strong>Pass</strong></span> |

Test execution evidence:

```text
node prototypes/spikes/006-schedule-eta/fixtures-and-tests.mjs
...
8/8 passed
```

## Decision

<span style="color:#16a34a"><strong>VALIDATED — SHIP V1 ETA AS SCHEDULE + OBSERVED DELAY WITH CONFIDENCE STATE</strong></span>

## Recommendation

| Production choice | Recommendation |
|---|---|
| ETA formula | `scheduled_time(target_stop) + observed_delay(latest_confirmed_stop)` |
| Confidence semantics | Use `predicted_low_confidence` when 2+ buses active on same route |
| No-log behavior | Return schedule-only ETA with explicit rider copy |
| Negative ETA | Clamp to 0 and show "Arriving now" wording |
| Service-ended state | Return no ETA and show "Service ended" |

## Implementation impact

| Area | Impact |
|---|---|
| Rider ETA store | Add pure ETA module and status enum |
| Driver/ops data contract | Ensure latest confirmed stop log timestamp is available to ETA calc |
| Rider copy | Add wording variants for `schedule_only`, `predicted`, `predicted_low_confidence`, `service_ended` |
| Testing | Keep fixture suite as regression guard for edge cases |

## Risks remaining

| Risk | Status |
|---|---|
| Multi-loop/day boundary business rules beyond single-day schedule | <span style="color:#f59e0b"><strong>Open</strong></span> |
| Interaction with skipped stops in real operational data | <span style="color:#f59e0b"><strong>Open</strong></span> |
| Rider comprehension for low-confidence ETA wording | <span style="color:#f59e0b"><strong>UX follow-up</strong></span> |
