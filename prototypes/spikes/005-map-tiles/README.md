# Spike 005: Map Tiles

## Question

Can MapLibre reliably render the target shuttle region without production use of `tile.openstreetmap.org`?

## Kill question

If OpenFreeMap or the chosen provider renders the target region poorly, loads too slowly on mobile, has unacceptable terms/cost risk, or lacks a credible fallback path, it is not safe as the V1 map default.

## Prototype

Path: `prototypes/spikes/005-map-tiles/index.html`

A standalone MapLibre browser page that pressure-tests:

- OpenFreeMap style loading
- provider-swappable style configuration
- sample route line and stop markers
- moving shuttle marker
- map load timing and error logging
- weak-network simulation for live marker updates
- exportable evidence logs

## Run locally

From repo root:

```bash
python3 -m http.server 4173 --directory prototypes/spikes
```

Open:

```text
http://localhost:4173/005-map-tiles/
```

## Pressure tests

1. Load the page and confirm the map renders with `OpenFreeMap Liberty`.
2. Confirm the route line, four stop markers, and shuttle marker appear.
3. Start the moving shuttle marker and confirm it progresses along the route.
4. Switch to `OpenFreeMap Bright` and confirm provider-swappable config works.
5. Toggle `Weak network simulation` and confirm live marker updates pause/degrade visibly without breaking the map shell.
6. Export logs and verify load timing/error evidence is captured.
7. Inspect source/logs and confirm there is no `tile.openstreetmap.org` usage.

## Expected MVP direction if validated

- Use MapLibre GL JS with OpenFreeMap as the V1 default tile provider.
- Keep tile provider config isolated so MapTiler or self-hosted PMTiles can replace it later.
- Do not use `tile.openstreetmap.org` for production traffic.
- Treat moving bus GPS as overlay data, separate from the base map provider.
