# Phase 6 — Turn-by-turn indoor navigation

## Objective

After a successful Phase 5 indoor route, the existing `/navigation` page enters **navigation mode** and guides the user one instruction at a time. The route is calculated once. Next and Back only change `currentStepIndex`.

This is **not** live positioning. Next simulates movement along the stored route.

## Navigation state

```
navigationState = {
  active,
  mode: "MANUAL_STEP",
  currentStepIndex,
  totalSteps,
  route,
  currentNodeId,
  destinationNodeId,
  currentLevel,
  completed
}
```

Helpers in `frontend/src/navigation/session.ts`:

- `createNavigationState(route, currentStepIndex, mode)`
- `getCurrentNavigationNode(state, liveNodeId?)` — Phase 6 uses the step node. Later `LIVE_POSITION` can pass a QR/GPS/BLE node.
- `isUserOnRoute(currentNodeId, routeNodes)` — `ON_ROUTE` / `OFF_ROUTE` / `UNKNOWN`. No reroute yet.

## Route to steps

Reuse `POST /api/routes/indoor`. `pathfinding.build_steps` converts nodes + edges into steps:

`START` → one step per edge → `ARRIVE`

Each step includes `step_index`, `action`, `instruction_text`, `voice_instruction` (for a later phase; not spoken now), optional `distance_m` / `estimated_time_sec` from the edge only, `level`, `from_node` / `to_node`, `landmark`, `sign_text`.

Turns use schematic coordinates when present. Level changes use `STAIRS` / `ESCALATOR` / `LIFT` when the edge type says so; otherwise `GO_UP` / `GO_DOWN`. Distances and signs are never invented.

## Next / Back

- Prepare route → store route → `currentStepIndex = 0`
- Next → `currentStepIndex += 1` (no API call)
- Back → `currentStepIndex -= 1`; disabled at 0
- Start again → `currentStepIndex = 0` on the same route
- Exit navigation → leave mode; keep station / start / destination

## Map

Existing `IndoorStationMap` stays on the page.

- Blue **YOU** marker at the current route node
- Red **DEST** marker at the destination
- Copper current segment, faded completed segments, dashed remaining route
- Auto-focus on the current node (and next node when both are on the same level)
- Level selector follows the current node’s level

Coordinates come from indoor graph data, not station-specific drawing code.

## Arrival

Final step: **YOU HAVE ARRIVED** plus destination name. Totals only if the route engine returned measured distance/time. Buttons: Start again, Finish.

## Errors

- No indoor graph: stay on the form, “Indoor navigation data is not currently available for this station.”
- `route_found = false`: do not enter navigation mode
- API failure: calculation error message
- UI never shows `undefined` / `null` / `NaN` as copy

## Future

- Phase 7: `mode = LIVE_POSITION`, `getCurrentNavigationNode` reads a live node
- Phase 8: `OFF_ROUTE` → recalculate (not implemented)
- Phase 9: speak `voice_instruction`

## Testing

API coverage: Begumpet Entrance→Concourse, Ameerpet Entrance→Platform 1 (level change), HITEC City Entrance→Concourse, Miyapur Entrance→Concourse, Kukatpally Entrance→Ticket counter. Voice/distance unit test: “5 m” only when `distance_m` is 5.

## Limitations

- Next is manual, not GPS/QR/BLE
- Development graphs have no `distance_m`, so metres are omitted
- No verified landmarks or `sign_text` in development seed
- Off-route does not reroute
- Voice is prepared, not played
