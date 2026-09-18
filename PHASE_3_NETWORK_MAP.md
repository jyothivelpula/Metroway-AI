# Phase 3 — Metro Network Map

## 1. Objective

Show how Hyderabad Metro **lines connect stations** (order, next/previous, interchanges, terminals). This is not indoor wayfinding.

## 2. Phase 1 and 2 preserved

Locked and unchanged in this pass:

- Dashboard, header, bottom navigation, colors, typography
- Station Directory search/cards
- Station Details
- Phase 2 APIs: `/api/lines`, `/api/stations`, nested station resources, search

The Network Map page already existed. It now reads `/api/network` instead of hardcoded corridor lists.

## 3. Architecture

```text
Phase 2 stations + lines + station_lines
        ↓
station_connections (Phase 3 development hops)
        ↓
GET /api/network
        ↓
Existing /metro-map page
        ↓
Existing Station Details
```

## 4. Database

Reused: `lines`, `stations`, `station_lines`, `sources`, `verification`

Extended: `station_connections`

- `from_station_id` / `to_station_id` / `line_id`
- `sequence_order` (1-based hop along the development corridor)
- `connection_type` = `NEXT_STATION` (reverse is derived)
- `is_bidirectional` = true
- `data_status` = `DEVELOPMENT` (internal; not shown in the UI)
- unique `(from, to, line)` and `from != to`

No `phase3_stations` table. No second Ameerpet row.

## 5. Development data

Temporary corridors for testing (not a verified full network):

- Red: Miyapur → JNTU College → KPHB Colony → Kukatpally → Ameerpet → M.G. Bus Station → LB Nagar
- Blue: Nagole → Uppal → Parade Ground → Ameerpet → Madhapur → HITEC City → Raidurg
- Green: Parade Ground → Secunderabad West → Gandhi Hospital → RTC X Roads → Chikkadpally → M.G. Bus Station

Names on screen are ordinary station names. Status stays in `data_status`.

## 6. Interchanges

Same `stations.id` on more than one line: Ameerpet (Red/Blue), Parade Ground (Blue/Green), M.G. Bus Station (Red/Green).

## 7. Terminals

First and last station of each development corridor, from `GET /api/network/terminals`, not hardcoded in React.

## 8. APIs

- `GET /api/network`
- `GET /api/network/lines/{line_id}` (`red`, `RED`, UUID)
- `GET /api/stations/{station_id}/connections`
- `GET /api/network/interchanges` → `{ "interchanges": [...] }`
- `GET /api/network/terminals`

404 unknown line/station. 500 database errors return a generic message.

## 9. Seed

```bash
cd backend
python seed_phase3_demo.py
```

Idempotent. Reuses Phase 2 station IDs. Running twice does not duplicate connections.

## 10. Tests

```bash
cd backend
python -m pytest -q
```

Phase 2 tests remain in `tests/test_api.py`. Phase 3 tests are in `tests/test_network.py`.

## 11. Future verified data

Replace `station_connections` (and sequences) with verified hops. Set `data_status = VERIFIED`. Keep the same endpoints and Network Map page.

## 12. Limitations

- Development subset omits some real corridor stations (for example Punjagutta is still in the directory, not on the development Red path).
- No indoor maps, distances, or route engine.

## 13. Phase 4 handoff

Phase 4 can attach indoor maps to the same `stations.id` values. Do not use `station_connections` as indoor edges.
