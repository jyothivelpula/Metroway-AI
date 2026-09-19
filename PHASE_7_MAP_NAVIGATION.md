# Phase 7 map navigation

MapLibre geographic map + existing indoor route and positioning. Phases 1–7 stay in place. Dashboard UI is unchanged.

## MapLibre integration

- Library: `maplibre-gl`
- Outdoor map: `frontend/src/map/OutdoorMap.tsx`
- Initialized once per mount with `useRef` / `useEffect`
- Destroyed with `map.remove()` on unmount
- Indoor navigation does **not** keep the geographic map mounted (no India map behind a lift 20 m away)

## Map provider

Central config: `frontend/src/map/config.ts`

```
MAP_STYLE_URL
```

Default (development): OpenFreeMap Liberty

```
https://tiles.openfreemap.org/styles/liberty
```

Override later with `VITE_MAP_STYLE_URL`. Do not scatter provider URLs through the app.

Initial camera: Hyderabad city center from `HYDERABAD_CENTER` (city view only). This is not a station GPS coordinate.

## Outdoor map

Used on `/navigation` before indoor navigation starts.

- Pan, wheel zoom, double-click zoom, pinch zoom
- Custom controls: zoom in, zoom out, locate me, fit
- Locate me uses MapLibre `GeolocateControl` (`enableHighAccuracy`, `trackUserLocation`)
- Follows the user until they pan; locate me resumes follow
- User marker: MapLibre location puck + accuracy halo
- Station marker only when `stations.latitude` / `longitude` are present in the API
- Interchange stations use a distinct marker color
- Popup: name, lines, interchange, Navigate

The seed currently stores `latitude: null`, `longitude: null`, `coordinate_source: NOT_AVAILABLE`. The map does **not** invent station GPS. Fly-to-station runs only when verified coordinates exist.

Metro network polylines are not drawn from fake coordinates. When HMRL/GTFS stop coordinates are loaded into `stations`, markers and fly-to work without a map rewrite.

## GPS behavior

Position modes:

- `OUTDOOR_POSITION` / `GPS` — browser geolocation
- `INDOOR_POSITION` / `QR` | `MANUAL` — Phase 7 resolver
- `NONE` — no fix

GPS never selects an indoor node. `PositionManager` already refuses to replace a QR/manual node with GPS.

If permission is denied or GPS fails:

- Outdoor map still works
- Copy: Location unavailable / Unable to access your location
- User can choose a starting point (manual) or scan QR

## Indoor map behavior

`IndoorStationMap` keeps Phase 4 schematic `x,y` (normalized station map, typically 0–100). Those are **not** converted to GPS.

Zoom/pan uses one SVG `viewBox` camera for the whole map (nodes, labels, route, You, destination). Controls do not scale elements independently.

Levels (Street / Concourse / Platform) change `levelId` without reloading the page or dropping step, route, or destination.

You marker sits on the indoor node from Phase 7 (`nodeId` → `x,y`).

Route paint:

- Remaining: MetroWay teal
- Completed: muted
- Current segment: stronger teal
- Destination: accent red
- You: blue with halo

## Position modes

| Source | Map |
| --- | --- |
| GPS | Outdoor only |
| QR | Indoor node |
| Manual | Indoor node (simulator) |
| None | Manual steps still work |

## Route rendering

Phase 5 `POST /api/routes/indoor` is unchanged. The indoor map draws `route.nodes` / `route.edges` in schematic coordinates.

Outdoor MapLibre layers are not used for indoor edges.

## Zoom architecture

Outdoor: MapLibre camera.

Indoor: `{ minX, minY, spanX, spanY }` → `viewBox`. Zoom toward You when known, otherwise map center. Fit frames the route and You.

## Step navigation

Phase 6 step index is unchanged. Card copy is user-facing (`Start at …`, `Walk straight`, `You have arrived`) and hides technical ids.

Live position still auto-advances via `stepIndexForPosition`. Next/Back remain for when positioning is unavailable.

## Off-route behavior

Phase 7 `detectOffRoute` + Phase 5 recalc. UI: “You're off the route.” / “Recalculating...” then the existing indoor route API from the current node.

## Fallback

- Map style error: “Map unavailable”; instructions stay
- GPS fail: choose starting point
- Indoor position missing: “Use the map to continue.” + manual Next

## Development simulator

Position panel “Choose an indoor location” is the node simulator. It is not labeled as a developer/debug console.

## Future QR / production map

QR still goes through `POST /api/position/resolve`. Swap `MAP_STYLE_URL` for a production MapLibre style when ready. Load verified stop coordinates into `stations` when an authorized HMRL/GTFS source is available.
