# Spike 007: PWA Permissions UX

## Question
Are rider entry and driver permission-recovery states clear enough for real-world PWA usage (especially denied geolocation)?

## Kill question
If permission-denied and recovery states are confusing, driver operations become unreliable and support burden spikes.

## Prototype
Path: `prototypes/spikes/007-pwa-permissions/index.html`

Includes:
- rider QR/code flow simulation
- invalid code blocked state
- driver permission preflight state checks
- geolocation denied simulation
- recovery steps panel
- exportable JSON logs

## Run locally
From repo root:

```bash
python3 -m http.server 4173 --directory prototypes/spikes
```

Open:

```text
http://localhost:4173/007-pwa-permissions/
```

## Pressure tests
1. Rider QR/code happy path
2. Rider invalid code state
3. Driver permission preflight state visibility
4. Denied geolocation blocked state
5. Recovery steps visibility
6. Exportable evidence logs

## Expected MVP direction if validated
- Keep rider access as QR/code no-login flow.
- Add explicit driver preflight gate before tracking starts.
- Add clear denied-permission recovery instructions in driver UI + ops runbook.
