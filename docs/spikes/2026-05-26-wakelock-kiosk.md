# Spike: Wake Lock + Fully Kiosk Reliability

## Question

Can the actual or closest Android tablet keep screen, browser, GPS, and network active for a full shuttle operating shift using Fully Kiosk Browser?

## Why this matters

This is the highest-risk MVP assumption. If browser geolocation + wake lock + Fully Kiosk cannot stay reliable, the driver tracking architecture needs a fallback before production build.

## Prototype

Created standalone browser prototype:

```text
prototypes/spikes/001-wakelock-kiosk/index.html
```

It tracks:

- secure-context availability
- Screen Wake Lock API support/state
- geolocation permission and samples
- network online/offline events
- visibility changes
- 5-second heartbeat timer drift
- exportable JSON event logs

## Test setup

- Device/browser: local desktop sanity test only so far
- Supabase project: not required for this spike
- Region: device current location
- Network: local network
- Test data: real geolocation samples when permission is granted

## Pressure tests

- Happy path: open page, request wake lock, start tracking, observe GPS samples and heartbeat logs.
- Failure path: deny geolocation; toggle offline/online; background/foreground the page.
- Edge cases still requiring real hardware: 4-8 hour Android/Fully Kiosk run, plugged-in charging behavior, thermal behavior, permission recovery in kiosk mode.

## Findings

Initial implementation and local static-server smoke test passed:

```text
http://localhost:4173/001-wakelock-kiosk/
HTTP 200
prototype smoke test passed
```

Desktop observation from Allan:

- Wake Lock stayed active up to the current observation point.
- Desktop screen has not shut down while the prototype is running.
- This is a useful browser sanity signal, but it is not tablet/Fully Kiosk validation.

No production verdict yet. Desktop/local testing does not validate the actual risk.

## Decision

PENDING REAL TABLET TEST

## Recommendation

Use this as the first field prototype. Host it over HTTPS, open it in Fully Kiosk Browser on the target Android tablet, run it for a realistic shift window, then export the JSON logs.

## Implementation impact

Depending on the result, production may need:

- driver page wake-lock acquisition and reacquisition on `visibilitychange`
- visible GPS/permission/network failure states
- tablet provisioning runbook in `docs/OPS.md`
- fallback plan if web-only tracking fails: native wrapper, Android foreground service, or external GPS tracker integration

## Risks remaining

- Actual tablet model unknown.
- Fully Kiosk settings not yet validated.
- Long-duration timer throttling not yet measured.
- Battery/charging/thermal behavior not yet measured.
