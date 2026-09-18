# Phase 4 — Indoor Station Maps

## 1. Objective

Provide a reusable indoor map data layer: levels, nodes, edges, and map metadata. This is not a route engine.

## 2. Existing architecture preserved

- Phase 1 dashboard, header, bottom navigation, colors, typography
- Phase 2 Station Directory, Station Details cards, and station APIs including `GET /api/stations/{id}/indoor-components`
- Phase 3 Network Map and network APIs

Phase 2 `indoor_components` remains a catalog of named indoor places. Phase 4 adds a separate graph for map rendering.

## 3. Database

Reused: `stations`, `station_levels` (STREET, CONCOURSE, PLATFORM)

Added:

- `indoor_nodes`
- `indoor_edges`
- `map_metadata`

Do not use `phase4_stations`. Ameerpet is the existing Phase 2 row (`AMP`).

## 4. indoor_nodes

Unique `(station_id, node_code)`. Fields include level, type, name, schematic `x`/`y` (0–100), optional lat/lng, `accessible`, `data_status`, verification fields. Coordinates in the development seed are **not** surveyed positions.

## 5. indoor_edges

Unique `(station_id, from_node_id, to_node_id, connection_type)`. `from != to`. Optional `distance_m` / `estimated_time_sec` are null in development data so the app does not invent metres.

## 6. map_metadata

Per station level: map type, width, height, coordinate system (`NORMALIZED_0_100`), version, `data_status`.

## 7. Levels

Phase 2 `station_levels` only. No second level system.

## 8. Node types

`ENTRANCE`, `EXIT`, `GATE`, `STAIRS`, `ESCALATOR`, `LIFT`, `SECURITY`, `TICKET_COUNTER`, `AFC_GATE`, `CONCOURSE`, `PLATFORM_ACCESS`, `PLATFORM`, `BUS_STOP`, `PARKING`, `FACILITY`, `INTERCHANGE`, `WAYPOINT`

## 9. Edge types

`WALK`, `STAIRS`, `ESCALATOR`, `LIFT`, `ENTRANCE`, `EXIT`, `PLATFORM_ACCESS`, `INTERCHANGE`

## 10. APIs

- `GET /api/stations/{station_id}/indoor-map`
- `GET /api/stations/{station_id}/indoor-map/{level_id}` (`STREET` or level UUID)
- `GET /api/stations/{station_id}/indoor-nodes`
- `GET /api/stations/{station_id}/indoor-edges`
- `GET /api/stations/{station_id}/map-metadata`

404 unknown station/level. `data_status` is in JSON for internal use; the UI does not print it.

## 11. Development data

Schematic Ameerpet graph only. Names on screen: Entrance, Concourse, Platform 1, Lift — never “Demo Ameerpet”. `data_status = DEVELOPMENT`.

## 12. Verification

Supported internally: `DEVELOPMENT`, `VERIFIED`, `SECONDARY_VERIFIED`, `CROSS_CHECKED`, `NEEDS_VERIFICATION`, `FIELD_VERIFICATION_REQUIRED`, `NOT_AVAILABLE`. Seed does not overwrite protected verified rows.

## 13. Ameerpet development graph

Street, concourse, and platform schematic nodes plus walk / vertical connections. No claimed real distances.

## 14. Frontend

Existing Station Details is unchanged except an **Indoor map** block under the current cards: level selector, SVG nodes/edges from the API, zoom and pan.

## 15. Testing

```bash
cd backend
python -m pytest -q
python seed_phase4_indoor.py
```

Frontend: `npm run build`

## 16. Replacing development data

Insert verified nodes/edges/metadata with the same schema. Set `data_status` to a verified status. Same APIs and SVG map.

## 17. Phase 5

Phase 5 should run a pathfinder on `indoor_nodes` + `indoor_edges` using `accessible` and `connection_type`. Do not treat this schematic as a real floor plan.
