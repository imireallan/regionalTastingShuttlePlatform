# Research Spike Prototypes

Throwaway prototypes for validating Regional Tasting Shuttle MVP risks.

Plan: `docs/spikes/2026-05-26-prototype-execution-plan.md`

## Run a static browser spike

From the repo root:

```bash
python3 -m http.server 4173 --directory prototypes/spikes
```

Then open:

- Wake Lock + Kiosk: http://localhost:4173/001-wakelock-kiosk/

Notes:

- `localhost` counts as a secure context for browser APIs during local testing.
- Real tablet testing should use a hosted HTTPS URL or HTTPS LAN tunnel.
- Do not treat local desktop success as validation for Android/Fully Kiosk.
