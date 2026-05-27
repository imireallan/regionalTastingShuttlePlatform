# Spike 006: Schedule ETA

## Question
Can V1 ETA use schedule time + observed delay from latest confirmed stop log without confusing rider output?

## Kill question
If schedule-plus-delay creates misleading ETA across common operations edge cases (late, early, no logs, loop rollover, service ended), V1 ETA scope must change.

## Prototype
Path: `prototypes/spikes/006-schedule-eta/`

- `calculate-eta.mjs` — pure ETA function
- `fixtures-and-tests.mjs` — fixture-driven pressure tests

## Run locally
From repo root:

```bash
node prototypes/spikes/006-schedule-eta/fixtures-and-tests.mjs
```

## Pressure tests
1. No prior stop log
2. Late bus (+delay)
3. Early bus (-delay)
4. Final-stop clamp at 0
5. Loop rollover
6. Missing/latest invalid stop fallback
7. Multi-bus confidence downgrade
8. Service ended

## Expected MVP direction if validated
- Use schedule + observed delay for V1 ETA.
- Return confidence status (`predicted` vs `predicted_low_confidence`) for rider wording.
- Clamp negative ETA to zero.
- Return no ETA when service ended.
