# Spike 001: Wake Lock + Fully Kiosk Reliability

<table>
  <tr>
    <td><strong>Status</strong></td>
    <td><span style="color:#f59e0b"><strong>PENDING REAL TABLET TEST</strong></span></td>
  </tr>
  <tr>
    <td><strong>Risk level</strong></td>
    <td><span style="color:#dc2626"><strong>High</strong></span> — can kill the web-only driver tracking approach</td>
  </tr>
  <tr>
    <td><strong>Current confidence</strong></td>
    <td><span style="color:#f59e0b"><strong>Partial desktop sanity signal only</strong></span></td>
  </tr>
</table>

## Executive summary

| Item | Result |
|---|---|
| Prototype created | <span style="color:#16a34a"><strong>Yes</strong></span> |
| Desktop wake lock behavior | <span style="color:#16a34a"><strong>Promising</strong></span> |
| Desktop screen stayed awake | <span style="color:#16a34a"><strong>Yes, up to current observation point</strong></span> |
| Android tablet tested | <span style="color:#dc2626"><strong>No</strong></span> |
| Fully Kiosk tested | <span style="color:#dc2626"><strong>No</strong></span> |
| Production decision | <span style="color:#f59e0b"><strong>Blocked until tablet test</strong></span> |

## Question

Can the actual or closest Android tablet keep screen, browser, GPS, and network active for a full shuttle operating shift using Fully Kiosk Browser?

## Why this matters

This is the highest-risk MVP assumption. If browser geolocation + wake lock + Fully Kiosk cannot stay reliable, the driver tracking architecture needs a fallback before production build.

## What this spike tests

| Test focus | What we need to learn |
|---|---|
| Wake Lock behavior | Whether the browser can keep the screen awake during driver operations. |
| Geolocation continuity | Whether location sampling continues while the page is active. |
| Timer reliability | Whether 3-5 second tracking/broadcast loops avoid serious throttling. |
| Network/visibility events | Whether the driver page can detect and communicate connectivity or tab visibility changes. |
| Fully Kiosk suitability | Whether Android + Fully Kiosk can run the driver page for a realistic shift. |
| Operational fallback need | Whether we need a native wrapper, Android foreground service, or external GPS tracker instead of web-only tracking. |

## Prototype

| Field | Details |
|---|---|
| Prototype path | `prototypes/spikes/001-wakelock-kiosk/index.html` |
| Run URL | `http://localhost:4173/001-wakelock-kiosk/` |
| Output | Browser UI + exportable JSON event logs |

The prototype tracks:

| Capability | Captured? |
|---|---:|
| Secure-context availability | Yes |
| Screen Wake Lock API support/state | Yes |
| Geolocation permission and samples | Yes |
| Network online/offline events | Yes |
| Visibility changes | Yes |
| 5-second heartbeat timer drift | Yes |
| Exportable JSON logs | Yes |

## Test setup

| Dimension | Current value |
|---|---|
| Device/browser | Local desktop sanity test only so far |
| Supabase project | Not required for this spike |
| Region | Device current location |
| Network | Local network |
| Test data | Real geolocation samples when permission is granted |

## Pressure-test results

| Test area | Expected | Observed | Status |
|---|---|---|---|
| Static prototype load | Page opens locally | HTTP 200, smoke test passed | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Wake Lock desktop behavior | Screen should remain awake while active | Wake Lock stayed active and desktop screen did not shut down up to current observation point | <span style="color:#16a34a"><strong>Pass on desktop</strong></span> |
| Android tablet long run | 4-8 hour tablet/Fully Kiosk run | Not tested yet | <span style="color:#f59e0b"><strong>Pending</strong></span> |
| Fully Kiosk behavior | Browser stays active, GPS/timers continue | Not tested yet | <span style="color:#f59e0b"><strong>Pending</strong></span> |
| Battery/thermal behavior | No overheating or drain while plugged in | Not tested yet | <span style="color:#f59e0b"><strong>Pending</strong></span> |
| Permission recovery | Denied/recovered geolocation is understandable | Not tested yet on tablet | <span style="color:#f59e0b"><strong>Pending</strong></span> |

## Findings

| Finding | Meaning |
|---|---|
| Local static-server smoke test passed | The prototype is runnable and ready for field testing. |
| Wake Lock stayed active on desktop | Browser Wake Lock path is working in at least one desktop environment. |
| Desktop screen did not shut down | Useful sanity signal, but not representative of Android tablet behavior. |
| No tablet/Fully Kiosk test yet | Cannot validate the actual production risk yet. |

Smoke test evidence:

```text
http://localhost:4173/001-wakelock-kiosk/
HTTP 200
prototype smoke test passed
```

## Decision

<span style="color:#f59e0b"><strong>PENDING REAL TABLET TEST</strong></span>

Desktop/local testing does not validate the actual operational risk.

## Recommendation

Host this prototype over HTTPS, open it in Fully Kiosk Browser on the target Android tablet, run it for a realistic shift window, then export the JSON logs.

## Implementation impact if validated

| Area | Impact |
|---|---|
| Driver UI | Add wake-lock acquisition and reacquisition on `visibilitychange`. |
| Driver status | Show visible GPS, permission, network, and stale tracking states. |
| Ops docs | Add tablet provisioning and Fully Kiosk settings to `docs/OPS.md`. |
| Fallback planning | Keep native wrapper / Android foreground service / external GPS tracker as fallback if tablet test fails. |

## Risks remaining

| Risk | Status |
|---|---|
| Actual tablet model unknown | <span style="color:#dc2626"><strong>Open</strong></span> |
| Fully Kiosk settings not validated | <span style="color:#dc2626"><strong>Open</strong></span> |
| Long-duration timer throttling not measured | <span style="color:#dc2626"><strong>Open</strong></span> |
| Battery/charging/thermal behavior not measured | <span style="color:#dc2626"><strong>Open</strong></span> |
