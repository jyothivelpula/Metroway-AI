# Phase 3 — Metro network backend

Phase 3 stores **how Hyderabad Metro stations are connected** on top of the Phase 2 station directory. It does not add indoor maps or a journey planner.

## 1. Objective

Answer: how is the network connected?

```text
Line → station sequence → next / previous station → interchange → terminal
```

## 2. Database changes

New table only:

- `station_connections` — directional `Station A → Station B` on a line

Indexes:

- `from_station_id`, `to_station_id`, `line_id`
- `station_lines (line_id, sequence_number)` and `station_id`

`network_nodes` / `network_edges` were **not** created. They would duplicate `stations` and `station_connections`. Phase 5 can treat `station_connections` as the inter-station graph.

## 3. Existing tables reused

`lines`, `stations`, `station_lines`, `sources`, `verification`

Sequence still lives on `station_lines.sequence_number` (per line, so Ameerpet can have different Red and Blue order).

## 4. Demo data

Seeded as `verification_status = DEMO`.

Representative public corridor names, including:

- Red: Miyapur, JNTU College, KPHB Colony, Kukatpally, Ameerpet, M.G. Bus Station, LB Nagar (plus Phase 2 Punjagutta)
- Blue: Nagole, Uppal, Parade Ground, Ameerpet, Madhapur, HITEC City, Raidurg (plus Phase 2 Secunderabad East, Begumpet)
- Green: Parade Ground (JBS), Secunderabad West, Gandhi Hospital, RTC X Roads, Chikkadpally, M.G. Bus Station

Connections follow **seeded sequence order**. Intermediate stations that are not in the demo set are omitted, not claimed to be absent from the real network.

Distances and travel times are empty.

## 5. API endpoints

- `GET /api/network`
- `GET /api/network/lines/{line_id}` (`RED`, `Blue`, UUID, etc.)
- `GET /api/stations/{station_id}/connections`
- `GET /api/network/interchanges`
- `GET /api/network/terminals`

Phase 2 endpoints are unchanged.

404 for unknown station or line.

## 6. Graph structure

```text
station_lines.sequence_number  →  order on a line
station_connections            →  NEXT_STATION edges only
previous station               →  derived by reversing the edge / sequence
interchange                    →  same station_id on more than one line
terminal / origin              →  first and last sequence on that line
```

## 7. Interchange handling

One physical `stations` row. Example: Ameerpet has Red and Blue `station_lines` rows. No second Ameerpet record.

## 8. Terminal handling

`GET /api/network/terminals` returns origin and terminal names from min/max sequence per line. Not hardcoded in the frontend.

## 9. Verification

Network rows use `DEMO`. `sources` / `verification` from Phase 2 are reused (`line_network` verification notes on each line).

## 10. Frontend

Existing `/metro-map` page is connected to `/api/network`. Same layout, cards, line chips, and filter buttons. Station click opens the existing Station Details route.

## 11. Replacing DEMO with verified data

Update `station_lines.sequence_number` and `station_connections`. Set `verification_status = VERIFIED`. Keep API JSON fields. The map page does not need a rebuild.

## 12. Phase 5 compatibility

Later indoor routing is a different graph (`indoor_components`). Inter-station routing can walk `station_connections`. Do not implement Dijkstra now.

## 13. How to run

```bash
cd backend
python seed_phase3_demo.py
python -m uvicorn app.main:app --reload --port 8000

cd ../frontend
npm run dev
```

Open `/metro-map`.

Tests:

```bash
cd backend
python -m pytest -q
```
