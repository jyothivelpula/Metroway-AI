# Phase 5 — Indoor Route Engine

## 1. Objective

Calculate a walkable indoor path between two nodes in one station using the Phase 4 graph. No GPS, QR, or live positioning.

## 2. Architecture

```text
POST /api/routes/indoor
        ↓
indoor_route_service (validate station + nodes)
        ↓
IndoorGraph from indoor_nodes + indoor_edges
        ↓
A* (pathfinding.py)
        ↓
ordered nodes / edges / steps
        ↓
existing Indoor Map UI
```

Routing is not implemented in the API handler.

## 3. Graph model

Reuses Phase 4 tables only. Bidirectional edges are expanded in memory. No duplicate stations, nodes, or edges.

## 4. A*

`f(n) = g(n) + h(n)`

- `g`: cumulative `edge_traversal_cost`
- `h`: Euclidean distance in schematic `x,y` when both nodes have coordinates; otherwise `0` (Dijkstra)

## 5. Cost

1. `estimated_time_sec` if present  
2. else `distance_m` if present  
3. else schematic length from coordinates (pathfinding only)  
4. else hop cost `1`

User-facing `total_distance_m` / `estimated_time_sec` are **null** unless every used edge has that field. No invented metres or wait times.

Connection types affect the **instruction**, not fabricated time weights.

## 6. Accessibility

`accessible_only=true` keeps only nodes/edges with `accessible is True`.

Unknown / false is **not** treated as verified accessible. Phase 4 stores a boolean (default false), not NULL.

Normal routing may use any edge.

## 7. Level transitions

`origin.level_id != dest.level_id` → stairs / escalator / lift steps using `connection_type` and `level_order` (up vs down).

## 8. Direction

If three consecutive same-level points have coordinates, classify STRAIGHT / LEFT / RIGHT / SLIGHT_*. Coordinates are schematic, not compass.

No signs table exists; no invented “follow the sign” text.

## 9–11. API

`POST /api/routes/indoor`

```json
{
  "station_id": "ameerpet or UUID",
  "start_node_id": "UUID or ST-GATE",
  "destination_node_id": "UUID or PL-1",
  "accessible_only": false,
  "current_node_id": null
}
```

`current_node_id` is accepted as an alias for start (Phase 7). GPS is not implemented.

Success includes `route_id` (ephemeral UUID), `route_found`, nodes, edges, steps.

## 12. Errors

| reason | HTTP |
|---|---|
| INVALID_STATION | 404 |
| START_NODE_NOT_FOUND | 404 |
| DESTINATION_NODE_NOT_FOUND | 404 |
| NODES_FROM_DIFFERENT_STATIONS | 400 |
| NO_PATH_AVAILABLE | 200 `route_found: false` |
| ACCESSIBLE_ROUTE_NOT_AVAILABLE | 200 `route_found: false` |
| INVALID_GRAPH / MISSING_EDGE | 400/500 |

## 13. Development data

Ameerpet Phase 4 graph. Names: Gate 1 (not “Gate A”). There is no Platform 3. One extra walk edge `CC-LIFT → CC-TICKET` lets an accessible lift path bypass inaccessible Security.

## 14. Testing

`python -m pytest -q`

## 15. Performance

One station graph per request, two queries (nodes+levels, edges), heapq A*. No Redis.

## 16. Phase 6

Consume `route_id`, steps, level transitions for a full navigation session UI.

## 17. GPS / QR

Later supply `current_node_id` instead of `start_node_id`.

## 18. Verified data

Replace node/edge rows; keep this engine.

## 19. Limitations

Schematic coordinates; no real distances in the seed; Ameerpet only; no turn precision; no Phase 6 session.
