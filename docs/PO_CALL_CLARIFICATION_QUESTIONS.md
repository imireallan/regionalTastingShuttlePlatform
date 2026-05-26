# Product Owner Call Clarification Questions

Date: 2026-05-22
Purpose: question set for the product owner call, framed in first person so I can use it directly during the conversation or paste it into Google Docs.

Call goal: align on scope, business assumptions, risk tolerance, and implementation readiness before starting build.

---

## Opening framing

I’ve reviewed the project brief and the proposed technical direction. I agree with the lean approach: one web app, Supabase as the backend platform, MapLibre for maps, and a kiosk-style driver tablet experience.

Before implementation, I’d like to clarify a few product and operational assumptions. My goal is to avoid overbuilding, validate the highest-risk parts early, and make sure the MVP matches how the shuttle actually runs day to day.

---

# 1. MVP scope clarification

## Question 1

For V1, is the core scope strictly:
- rider QR/code access to live map and ETA,
- driver tablet stop logging and live position sharing,
- owner/admin dashboard for daily codes, routes, buses, drivers, and basic metrics?

Or is there anything else you consider mandatory for launch?

## Why I’m asking

This keeps us from accidentally expanding the MVP into bookings, payments, customer accounts, or dispatch optimization.

## My recommendation

Keep V1 focused on operations and tracking. Defer rider accounts, booking, payments, native apps, and complex dispatch.

---

## Question 2

What is the absolute launch-critical workflow?

If we only had time to make one workflow excellent, which one matters most:
- rider tracking,
- driver stop logging,
- admin operations,
- business metrics,
- or tablet reliability?

## Why I’m asking

This helps prioritize implementation if timelines get tight.

## My recommendation

Prioritize driver reliability first, then rider tracking, then admin metrics. If driver data fails, everything downstream becomes unreliable.

---

# 2. Design/mockup clarification

## Question 3

Can we come up with our own design mockups for the rider, driver, and admin screens, or is there an existing brand/design direction we need to follow?

## Why I’m asking

The brief defines the workflow well, but not the visual system. We can move faster if we create pragmatic mockups ourselves and get quick approval.

## My recommendation

Yes, we should create our own lightweight design mockups unless there is already a required design system.

I’d propose 3 simple mockups:

1. Rider mobile view
- daily code gate
- live map
- shuttle marker
- next stop ETA
- service status

2. Driver tablet view
- assigned bus/route
- GPS/status indicator
- large Arrived button
- boarded/alighted counters
- Confirm button
- offline/sync status

3. Admin dashboard
- today’s code
- active buses
- route assignment
- live map
- stop logs
- daily totals

## Approval question

Would you prefer clickable low-fidelity wireframes first, or should we go straight to simple polished UI mockups in the app style?

---

# 3. Frontend framework clarification

## Question 4

The brief says React + Vite. Are you comfortable with us using the React Router framework instead of plain React/Vite routing?

## Why I’m asking

React Router can still be built on Vite, but it gives us a stronger app structure for route-based screens, loaders/actions, error boundaries, nested layouts, and future maintainability.

## My recommendation

Use React Router framework for the frontend, unless there is a strict reason to keep it as plain React + Vite SPA.

Suggested route structure:

```text
/
  rider code gate / rider map
/driver
  driver tablet console
/admin
  admin dashboard
/admin/routes
/admin/stops
/admin/buses
/admin/drivers
/admin/daily-codes
```

## Important note

Using React Router does not mean adding a heavy backend. Supabase can still remain the backend platform. React Router would primarily organize the frontend app and route-level data/actions.

## Decision needed

Can we treat “React + Vite” as allowing React Router framework, or do you specifically want a plain Vite SPA with client-side routing only?

---

# 4. Implementation timing clarification

## Question 5

How soon do you want implementation to start?

Would you prefer:

Option A: Start Phase 0 spikes immediately, then production build after key risks are validated.

Option B: Start UI/app scaffolding in parallel with spikes.

Option C: Start full implementation immediately and validate risks as we go.

## My recommendation

Option B is the best balance:
- Start safe implementation immediately: repo scaffold, frontend shell, Supabase schema draft, mockups.
- In parallel, run the high-risk spikes: tablet reliability, realtime broadcast, tile provider, driver auth.
- Do not fully commit the driver tracking implementation until tablet/kiosk reliability is validated.

## Practical timeline proposal

Immediate start:
- project scaffold
- design mockups
- route shell
- Supabase schema/migrations draft
- spike prototypes

Before full build lock-in:
- tablet/kiosk test result
- tile provider selected
- driver auth/RLS approach selected
- realtime broadcast prototype validated

## Decision needed

Are you comfortable starting low-risk implementation immediately while treating tablet/realtime/tile/auth as Phase 0 validation gates?

---

# 5. Route and operations clarification

## Question 6

What is the exact launch route?

I’d like to confirm:
- region/city
- stop names
- stop addresses or coordinates
- route order
- service days
- service hours
- expected loop duration
- expected dwell time at each stop

## Why I’m asking

This affects map testing, ETA logic, seed data, driver UI, and admin setup.

---

## Question 7

Is there a fixed timetable per stop, or is the shuttle loop more flexible?

## Why I’m asking

The proposed V1 ETA is schedule-based. That works best if there is at least an expected stop sequence and approximate times.

## My recommendation

Use approximate schedule-based ETA for V1. Avoid a routing engine unless the PO expects highly precise ETAs.

---

## Question 8

Are there known low-signal or dead-zone areas on the route?

## Why I’m asking

This determines whether a light IndexedDB buffer is enough or whether offline sync needs to be more robust.

## My recommendation

For V1, preserve stop taps offline. Do not overbuild full GPS offline replay unless the route has serious dead zones.

---

# 6. Rider experience clarification

## Question 9

What should riders see if no bus is currently broadcasting location?

Options:
- last known bus location,
- “bus location temporarily unavailable,”
- schedule-only ETA,
- support/contact message,
- hide map until position resumes.

## My recommendation

Show last known position if available, clearly labeled, plus service status text.

---

## Question 10

Should riders see all active buses on the route, or only the nearest/next bus?

## Why I’m asking

This affects map UI and ETA wording.

## My recommendation

For V1, show all active buses if there are only 2–4. Also highlight the next likely arrival if ETA logic supports it.

---

## Question 11

Should the rider daily code be route-specific, date-specific, or both?

## My recommendation

Both route-specific and date-specific. That keeps the model clean when a secondary route is added later.

---

# 7. Driver workflow clarification

## Question 12

How many drivers will operate at launch, and do drivers have assigned buses/tablets?

## Why I’m asking

This affects driver auth, RLS, bus assignment, and tablet provisioning.

---

## Question 13

Is the driver flow expected to be:
- select driver name,
- enter 4-digit PIN,
- confirm bus/route,
- start shift?

Or should the tablet already be locked to a specific bus?

## My recommendation

If each tablet belongs to a bus, preconfigure the tablet/bus pairing and make the driver confirm it. That reduces mistakes.

---

## Question 14

What should happen if a driver forgets to tap Arrived at a stop?

Options:
- allow admin correction later,
- let driver backfill previous stop,
- infer skipped/forgotten stop from later arrival,
- ignore for V1.

## My recommendation

For V1, keep the driver UI simple and allow admin correction/backfill only if necessary.

---

## Question 15

Do drivers need to see passenger occupancy/fullness, or only record boarded/alighted counts?

## My recommendation

Record boarded/alighted as facts. Treat occupancy as approximate only if shown at all.

---

# 8. Tablet/kiosk clarification

## Question 16

What exact Android tablet model will be used?

## Why I’m asking

We need to validate geolocation, screen wake, browser behavior, battery/charging, and Fully Kiosk compatibility on the real device.

---

## Question 17

Will tablets be mounted and charging continuously during service?

## Why I’m asking

The architecture assumes tablets behave like fixed appliances, not personal mobile devices.

---

## Question 18

Who will provision and maintain the tablets?

Options:
- engineering team ships configured tablets,
- owner configures tablets,
- drivers configure tablets,
- operations/support person configures tablets.

## My recommendation

Do not rely on drivers configuring tablets. Treat tablet setup as part of the launch deliverable.

---

## Question 19

What is the operational fallback if a tablet stops broadcasting mid-shift?

## Why I’m asking

Even with good engineering, physical devices fail. We need a support process.

---

# 9. Admin/owner workflow clarification

## Question 20

Who generates the daily access code, and when?

Examples:
- automatically each morning,
- manually by owner,
- manually by admin before service,
- generated days in advance.

## My recommendation

Start with manual admin generation for V1, with the option to automate later.

---

## Question 21

What admin metrics are truly needed at launch?

Possible metrics:
- total boarded
- total alighted
- per-stop traffic
- per-bus traffic
- stop arrival timestamps
- on-time signal
- missed stops
- active buses

## My recommendation

Keep V1 metrics to daily totals, per-stop totals, per-bus totals, and basic on-time signal.

---

## Question 22

Does the owner need CSV export for stop logs at launch?

## My recommendation

Yes, CSV export is a low-complexity admin feature that makes the data useful immediately.

---

# 10. Security/access clarification

## Question 23

Who needs admin access at launch?

## Why I’m asking

This determines whether a single owner account is enough or whether we need multiple admin users/roles.

## My recommendation

Start with one owner/admin account unless there is a clear need for multiple admin roles.

---

## Question 24

Should daily rider codes be simple numeric codes, words, QR-only, or both QR + manual code entry?

## My recommendation

Use QR plus a simple 6-digit numeric code. QR is fast, manual code is a fallback.

---

# 11. Delivery/process clarification

## Question 25

What is the preferred delivery style?

Options:
- quick prototypes for review,
- weekly demos,
- milestone-based delivery,
- direct production push after acceptance.

## My recommendation

Weekly demos plus milestone acceptance. For this project, short feedback loops matter more than heavy documentation.

---

## Question 26

Who gives final approval on UX and operational workflows?

## Why I’m asking

The admin/driver flows need sign-off from someone who understands actual service operations.

---

## Question 27

What is the target launch date for the tracking app, not the shuttle service itself?

## Why I’m asking

The brief says shuttle operations may start manually before the app. I want to clarify the actual software deadline.

---

# 12. Key questions I should definitely ask live

If time is short, these are the highest-value questions:

1. What exact tablet model will drivers use, and will it be mounted/charging all day?
2. Who owns tablet provisioning and support during service?
3. What is the exact launch route and stop list?
4. Are there known low-signal areas?
5. Is 3–5 second bus location freshness acceptable?
6. Do you need historical GPS trails, or only live position plus stop logs?
7. Is “name + PIN” a hard driver auth requirement?
8. Can we create our own design mockups for approval?
9. Are you comfortable with React Router framework instead of plain React/Vite routing?
10. Can we start safe implementation immediately while running Phase 0 spikes in parallel?

---

# My proposed call close

Based on what we’ve discussed, my recommendation would be:

1. Start immediately with low-risk foundation work: repo scaffold, app shell, Supabase schema draft, and design mockups.
2. Run Phase 0 spikes in parallel, especially the tablet/kiosk reliability test.
3. Do not fully commit the driver tracking implementation until the tablet test passes.
4. Keep V1 scoped to live tracking, stop logging, daily codes, route/bus/admin setup, and basic metrics.
5. Defer rider accounts, payments, booking, native apps, and complex ETA/routing.

If we align on that, I can move from planning into implementation quickly while still protecting the project from the riskiest assumptions.
