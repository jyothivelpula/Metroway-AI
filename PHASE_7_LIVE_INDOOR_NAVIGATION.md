# Phase 7 live indoor navigation

`/navigation` is an indoor wayfinding screen. It does not show a geographic India/world map.

## Indoor map architecture

- Primary map: `IndoorStationMap` schematic `x,y` in one SVG `viewBox` camera
- Zoom/pan transform the whole map together
- Controls: zoom in, zoom out, Recenter, Fit route
- Recenter turns follow mode back on
- Manual pan turns follow off
- Street / Concourse / Platform tabs keep route, position, and step
- Geographic MapLibre (`OutdoorMap`) is not mounted here. Network geography stays on `/metro-map`

## Position sources

| Source | Indoor marker |
| --- | --- |
| `SIMULATION_POSITION` | Live movement along the calculated route |
| `QR_POSITION` | Snap to resolved node, then remaining route |
| `MANUAL_POSITION` | Snap to chosen node |
| `GPS_POSITION` | Outdoor only; never mapped onto indoor `x,y` |

## Simulation

On Start navigation the You marker begins at the route start.

- **Move to next / Previous** — interpolates along the current route segment
- **Auto navigate** — continues node to node until destination
- `requestAnimationFrame` + easing
- `prefers-reduced-motion` snaps instead of animating
- Simulation does not invent metres; it only moves on Phase 5 route nodes

## Marker movement

The blue You marker (halo + white center) is drawn at interpolated `{x,y}`, not as a normal node. Destination stays red. Completed route is muted; the current segment is teal.

## Route following

Phase 5 `POST /api/routes/indoor` is unchanged. Position along `route.nodes` drives:

- remaining / completed paint
- `stepIndexForPosition` (automatic instruction updates)
- off-route detection + the same engine for recalc

## Turn-by-turn instructions

Route steps come from Phase 5 geometry (`turn_label` with configurable degree bands in `backend/app/nav_config.py`). The live card shows:

- large current action + icon
- spoken-ready `instruction_text` / `voice_instruction`
- remaining distance on the current segment (measured metres when `distance_m` exists; otherwise schematic map length for live countdown only — not stored as verified metres)
- next step preview
- level / landmark / sign text from node and edge data only

The current map segment and the instruction card share `travelFromId` / `travelToId` and `segmentProgress`.

## Automatic step progression

Live/simulation mode: the current node selects the step. Next is not the primary control. Arrival stops auto-move.

## QR

Existing `POST /api/position/resolve`. Snap You to that node. If off-route, recalculate from that node with Phase 5.

## GPS limitation

GPS is not presented as indoor positioning and is not converted to schematic station coordinates.

## Off-route / arrival

Off-route: “You're off the route.” / “Recalculating...” then Phase 5 from the current node.

Arrival: You've arrived, auto-move stops, Done / Start another route.

## Future indoor positioning

Replace simulation/QR with BLE/UWB or similar by applying a node id through `PositionManager`. The indoor map and instruction card do not need a new route engine.
