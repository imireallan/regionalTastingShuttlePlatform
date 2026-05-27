# Spike 007: PWA Permissions UX

<table>
  <tr>
    <td><strong>Status</strong></td>
    <td><span style="color:#16a34a"><strong>VALIDATED FOR V1 UX SHAPE (DESKTOP PROTOTYPE)</strong></span></td>
  </tr>
  <tr>
    <td><strong>Risk level</strong></td>
    <td><span style="color:#f59e0b"><strong>Medium</strong></span> — UX states are clear, but device-specific behavior still needs field confirmation</td>
  </tr>
  <tr>
    <td><strong>Architecture signal</strong></td>
    <td><span style="color:#16a34a"><strong>Positive</strong></span> — explicit preflight + recovery flow is feasible and low-complexity</td>
  </tr>
</table>

## Executive summary

| Item | Result |
|---|---|
| Rider QR/code happy path | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Rider invalid code state | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Driver permission preflight | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Denied geolocation blocked state | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Recovery guidance | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Browser runtime errors | <span style="color:#16a34a"><strong>None observed</strong></span> |

## Question

If geolocation is denied or permissions are ambiguous, can the driver/rider UX still guide users to recovery without ambiguity?

## Prototype

| Field | Details |
|---|---|
| Prototype path | `prototypes/spikes/007-pwa-permissions/index.html` |
| Run URL | `http://localhost:4173/007-pwa-permissions/` |
| Evidence output | Exportable JSON event logs |
| Scope | Rider entry flow + driver permission preflight/recovery states |

## Pressure-test results

| Test area | Expected | Observed | Status |
|---|---|---|---|
| Rider QR/code happy path | Continue should produce active rider state | Browser QA `Continue` set rider state to active | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Rider invalid-code state | Invalid code should show blocked state | Browser QA `Simulate invalid code` set `state: blocked (invalid code)` | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Driver preflight check | Permission states should be visible | `Run permission check` produced geolocation/notifications state values | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Denied geolocation state | Driver blocked state should be explicit | `Simulate geolocation denied` set `geo=denied`, `outcome=preflight blocked` | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Recovery guidance | Actionable steps should be present | Recovery checklist visible and review action logged | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Checklist completeness | Pressure checklist should reflect tested states | Browser QA showed all 6 checklist items as `observed` | <span style="color:#16a34a"><strong>Pass</strong></span> |
| Browser console health | No runtime JS errors during interaction flow | `js_errors: []` in QA pass | <span style="color:#16a34a"><strong>Pass</strong></span> |

## Findings

| Finding | Interpretation |
|---|---|
| Rider flow can cleanly represent both happy and blocked entry states. | Supports anonymous rider access UX with low confusion risk. |
| Driver preflight clearly separates permission status from operational readiness. | Reduces ambiguity before starting live tracking. |
| Denied geolocation handling is explicit and paired with concrete recovery actions. | Good fit for tablet runbook and support troubleshooting. |
| No runtime errors during state transitions. | Prototype logic is stable enough to inform production UX. |

## Decision

<span style="color:#16a34a"><strong>VALIDATED — ADD EXPLICIT DRIVER PREFLIGHT + PERMISSION RECOVERY UX TO V1</strong></span>

## Recommendation

| Production choice | Recommendation |
|---|---|
| Rider access | Keep QR/code anonymous flow with clear invalid-code state. |
| Driver launch | Add mandatory permission preflight before tracking/broadcast starts. |
| Denied location | Block tracking and show clear recovery actions in-page. |
| Ops runbook | Mirror recovery steps in tablet/Fully Kiosk SOP. |
| Telemetry | Log permission/preflight transitions for support diagnostics. |

## Implementation impact

| Area | Impact |
|---|---|
| Driver UI | Add `PermissionGate`/preflight module and blocked-state screen. |
| Rider UI | Keep code validation feedback crisp and immediate. |
| Ops docs | Add location-permission recovery steps for Android + Fully Kiosk. |
| Monitoring | Capture denied-permission and recovery-attempt events. |

## Risks remaining

| Risk | Status |
|---|---|
| iOS Safari permission edge cases not field-tested | <span style="color:#f59e0b"><strong>Open</strong></span> |
| Android Chrome/Fully Kiosk permission UX differences not field-tested | <span style="color:#f59e0b"><strong>Open</strong></span> |
| Install prompt timing and copy on real devices | <span style="color:#f59e0b"><strong>Open</strong></span> |
