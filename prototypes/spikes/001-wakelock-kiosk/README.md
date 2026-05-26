# Spike: Wake Lock + Fully Kiosk Reliability

## Question

Can the driver web page keep screen, GPS, network state, and 3-5 second timers active long enough for a real shuttle shift on Android + Fully Kiosk Browser?

## Kill question

If the Android/Fully Kiosk setup cannot keep geolocation and the page timer active reliably during realistic operation, web-only driver tracking is not safe for MVP.

## Prototype

A standalone browser page that:

- requests geolocation
- requests Screen Wake Lock where supported
- samples location every 5 seconds
- measures timer drift
- tracks online/offline state
- logs visibility changes, errors, and position updates
- exports logs as JSON for field-test evidence

## Run locally

From repo root:

```bash
python3 -m http.server 4173 --directory prototypes/spikes
```

Open:

```text
http://localhost:4173/001-wakelock-kiosk/
```

## Real device test

Local desktop testing is not enough. For the actual spike verdict, host this page over HTTPS and open it in Fully Kiosk Browser on the target Android tablet.

Test setup to capture:

- Device model:
- Android version:
- Fully Kiosk version:
- Power: plugged/unplugged:
- Browser URL:
- Test duration:
- Network condition:

## Pressure tests

- Happy path: grant geolocation, start tracking, verify location samples every 5 seconds.
- Wake lock: verify lock acquired and reacquired after visibility changes.
- Permission failure: deny geolocation and confirm UI gives clear failure state.
- Network: toggle offline/online and confirm event logging.
- Long run: leave active for 4-8 hours on the target tablet and export logs.

## Verdict

Pending real tablet test.
