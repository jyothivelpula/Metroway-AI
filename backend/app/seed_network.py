from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from app.database import engine
from app.models import Line, Station, StationConnection

# Temporary development corridor used by the Network Map. Not a verified HMRL dump.
DEVELOPMENT_NETWORK: dict[str, list[str]] = {
    "RED": ["MYP", "JNT", "KHB", "KKP", "AMP", "MGB", "LBN"],
    "BLUE": ["NGL", "UPL", "PDG", "AMP", "MDP", "HIT", "RDG"],
    "GREEN": ["PDG", "SCW", "GNH", "RTC", "CKD", "MGB"],
}


def ensure_network_columns() -> None:
    inspector = inspect(engine)
    if "station_connections" not in inspector.get_table_names():
        return
    cols = {column["name"] for column in inspector.get_columns("station_connections")}
    statements = []
    if "data_status" not in cols:
        statements.append("ALTER TABLE station_connections ADD COLUMN data_status VARCHAR(40) DEFAULT 'DEVELOPMENT'")
    if "is_bidirectional" not in cols:
        statements.append("ALTER TABLE station_connections ADD COLUMN is_bidirectional BOOLEAN DEFAULT 1")
    if "sequence_order" not in cols:
        statements.append("ALTER TABLE station_connections ADD COLUMN sequence_order INTEGER")
    if "notes" not in cols:
        statements.append("ALTER TABLE station_connections ADD COLUMN notes TEXT")
    if "last_verified_date" not in cols:
        statements.append("ALTER TABLE station_connections ADD COLUMN last_verified_date DATE")
    if not statements:
        return
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _one(db: Session, model, **filters):
    return db.scalar(select(model).filter_by(**filters))


_PROTECTED_STATUSES = {"VERIFIED", "FIELD_VERIFIED"}


def _is_protected(row) -> bool:
    return (
        getattr(row, "data_status", None) in _PROTECTED_STATUSES
        or getattr(row, "verification_status", None) in _PROTECTED_STATUSES
    )


def _upsert_development_connection(db: Session, unique: dict, values: dict):
    row = _one(db, StationConnection, **unique)
    if row is None:
        row = StationConnection(**unique, **values)
        db.add(row)
        db.flush()
        return row
    if _is_protected(row):
        return row
    for key, value in values.items():
        setattr(row, key, value)
    db.flush()
    return row


def seed_development_network(db: Session, lines: dict[str, Line], source_id: str) -> None:
    ensure_network_columns()
    kept: dict[str, set[tuple[str, str]]] = {}
    for line_code, codes in DEVELOPMENT_NETWORK.items():
        line = lines[line_code]
        stations = []
        for code in codes:
            station = _one(db, Station, station_code=code)
            if station is None:
                raise ValueError(f"Missing Phase 2 station {code} for {line_code} network seed")
            stations.append(station)
        origin_name = stations[0].station_name
        terminal_name = stations[-1].station_name
        direction = f"{origin_name} → {terminal_name}"
        pairs: set[tuple[str, str]] = set()
        for index, (current, nxt) in enumerate(zip(stations, stations[1:]), start=1):
            if current.id == nxt.id:
                continue
            _upsert_development_connection(
                db,
                {
                    "from_station_id": current.id,
                    "to_station_id": nxt.id,
                    "line_id": line.id,
                },
                {
                    "sequence_from": index,
                    "sequence_to": index + 1,
                    "sequence_order": index,
                    "connection_type": "NEXT_STATION",
                    "distance": None,
                    "distance_unit": None,
                    "estimated_travel_time": None,
                    "direction": direction,
                    "is_bidirectional": True,
                    "is_interchange": False,
                    "is_terminal": index == 1 or index + 1 == len(stations),
                    "data_status": "DEVELOPMENT",
                    "verification_status": "DEVELOPMENT",
                    "source_id": source_id,
                },
            )
            pairs.add((current.id, nxt.id))
        kept[line.id] = pairs

    for line_id, pairs in kept.items():
        extras = db.scalars(select(StationConnection).where(StationConnection.line_id == line_id)).all()
        for edge in extras:
            if (edge.from_station_id, edge.to_station_id) not in pairs and not _is_protected(edge):
                db.delete(edge)
    db.flush()
