# Phase 2 database

MetroWay AI Phase 2 adds a station-directory data layer behind the existing dashboard. The UI is unchanged except that station lists, search, filters, and station details read from APIs instead of hardcoded arrays.

## Architecture

```text
HMRL (https://hmrl.co.in/) + public route-map corridor labels
        ↓
DEMO seed records (verification_status = DEMO)
        ↓
PostgreSQL-compatible database (SQLAlchemy)
        ↓
FastAPI REST APIs
        ↓
Existing Phase 1/2 UI (Station Directory + Station Details)
```

This machine does not have Docker. Local development defaults to SQLite (`sqlite:///./metroway.db`) with a PostgreSQL-compatible schema. Production should set:

```text
DATABASE_URL=postgresql+psycopg2://metroway:metroway@localhost:5432/metroway
```

`docker-compose.yml` at the repo root starts PostgreSQL 16 when Docker is available.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python seed_demo_data.py
uvicorn app.main:app --reload --port 8000
```

The API also creates tables on startup and seeds only if `stations` is empty.

Frontend (existing UI):

```bash
cd frontend
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8000`.

## Seed command

```bash
python seed_demo_data.py
```

The seed is idempotent. Unique keys prevent duplicate lines, stations, platforms, gates, and related rows.

## Tables

| Table | Purpose |
| --- | --- |
| `lines` | RED / BLUE / GREEN corridors |
| `stations` | Station identity and location fields |
| `station_lines` | Many-to-many membership, sequence, interchange, terminal |
| `station_levels` | STREET / CONCOURSE / PLATFORM placeholders |
| `platforms` | DEMO platform rows |
| `gates` | DEMO gates (no Arm-to-gate mapping) |
| `facilities` | DEMO facility types |
| `accessibility` | Per-station accessibility placeholders |
| `station_bus_connections` | DEMO bus stops; no real route numbers |
| `nearby_destinations` | DEMO landmarks |
| `indoor_components` | Future navigation nodes without coordinates |
| `sources` | HMRL, route map, DEMO DATA |
| `verification` | Status per entity |

## Relationships

- `station_lines.station_id` → `stations.id`
- `station_lines.line_id` → `lines.id`
- Child station tables (`platforms`, `gates`, `facilities`, …) → `stations.id`
- Optional `level_id` / `source_id` foreign keys

## APIs

- `GET /api/health`
- `GET /api/lines`
- `GET /api/stations`
- `GET /api/stations?q=`
- `GET /api/stations?line=Red`
- `GET /api/stations/search?q=`
- `GET /api/stations/{id}` (UUID, station code, or slug such as `ameerpet`)
- `GET /api/stations/{id}/platforms`
- `GET /api/stations/{id}/gates`
- `GET /api/stations/{id}/levels`
- `GET /api/stations/{id}/facilities`
- `GET /api/stations/{id}/accessibility`
- `GET /api/stations/{id}/bus-connections`
- `GET /api/stations/{id}/nearby-destinations`
- `GET /api/stations/{id}/indoor-components`
- `GET /api/stations/{id}/verification`

## Demo data

14 public station names from the Hyderabad Metro network, including Ameerpet, Miyapur, Kukatpally, Punjagutta, Nagole, Madhapur, Raidurg, Parade Ground, M.G. Bus Station, Secunderabad East, HITEC City, LB Nagar, Begumpet, and JNTU College.

Line membership and sequence numbers follow public corridor order (Red: Miyapur–LB Nagar, Blue: Nagole–Raidurg, Green: JBS Parade Ground–M.G. Bus Station). Interchanges: Ameerpet (Red/Blue), Parade Ground (Blue/Green), M.G. Bus Station (Red/Green).

Coordinates, gates, facilities, bus routes, nearby POIs, and indoor nodes are DEMO placeholders. They are not verified station surveys.

The referenced file `HMRRouteMap_new(1).pdf` was not in the repository. Corridor labels were taken from public HMRL network information ([hmrl.co.in](https://hmrl.co.in/)).

## Verification statuses

`DEMO`, `VERIFIED`, `SECONDARY_VERIFIED`, `CROSS_CHECKED`, `NEEDS_VERIFICATION`, `NOT_AVAILABLE`, `FIELD_VERIFICATION_REQUIRED`

Seeded rows use `DEMO`.

## Replacing DEMO data with verified data

1. Keep the same table names and API JSON fields.
2. Update (do not redesign) rows: names, codes, coordinates, platforms, gates, facilities.
3. Set `verification_status = VERIFIED` and fill `sources` / `verification`.
4. Leave indoor `x` / `y` empty until Phase 4–5 verified graphs exist.
5. Restart is not required for the UI contract; the existing Station Directory and Station Details screens will show the new values.

Do not use an LLM to invent walking paths or treat DEMO gates as production wayfinding.
