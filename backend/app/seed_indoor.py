from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import IndoorEdge, IndoorNode, MapMetadata, PositionMarker, Station, StationLevel

# Schematic Ameerpet layout for architecture testing only. Not a surveyed floor plan.
# Coordinates are normalized 0–100. Distances are not stored as real metres.
PROTECTED = {"VERIFIED", "SECONDARY_VERIFIED", "CROSS_CHECKED", "FIELD_VERIFIED"}

NODES = [
    ("ST-ENT", "STREET", "ENTRANCE", "Entrance", 18, 82, True),
    ("ST-EXIT", "STREET", "EXIT", "Exit", 82, 82, True),
    ("ST-GATE", "STREET", "GATE", "Gate 1", 50, 78, False),
    ("ST-BUS", "STREET", "BUS_STOP", "Bus connection", 14, 92, True),
    ("ST-PARK", "STREET", "PARKING", "Parking", 86, 92, False),
    ("ST-STAIRS", "STREET", "STAIRS", "Stairs", 34, 52, False),
    ("ST-LIFT", "STREET", "LIFT", "Lift", 66, 52, True),
    ("ST-WP", "STREET", "WAYPOINT", "Street waypoint", 50, 64, True),
    ("CC-STAIRS", "CONCOURSE", "STAIRS", "Stairs from street", 34, 18, False),
    ("CC-LIFT", "CONCOURSE", "LIFT", "Lift from street", 66, 18, True),
    ("CC-SEC", "CONCOURSE", "SECURITY", "Security", 50, 30, False),
    ("CC-TICKET", "CONCOURSE", "TICKET_COUNTER", "Ticket counter", 22, 40, True),
    ("CC-AFC", "CONCOURSE", "AFC_GATE", "AFC gates", 50, 48, True),
    ("CC-HALL", "CONCOURSE", "CONCOURSE", "Concourse", 50, 58, True),
    ("CC-FAC", "CONCOURSE", "FACILITY", "Washroom", 82, 40, True),
    ("CC-IX", "CONCOURSE", "INTERCHANGE", "Interchange", 18, 62, True),
    ("CC-STAIRS-P", "CONCOURSE", "STAIRS", "Stairs to platform", 34, 82, False),
    ("CC-ESC", "CONCOURSE", "ESCALATOR", "Escalator to platform", 50, 82, False),
    ("CC-LIFT-P", "CONCOURSE", "LIFT", "Lift to platform", 66, 82, True),
    ("CC-WP", "CONCOURSE", "WAYPOINT", "Concourse waypoint", 50, 68, True),
    ("PL-ACCESS", "PLATFORM", "PLATFORM_ACCESS", "Platform access", 50, 22, True),
    ("PL-LIFT", "PLATFORM", "LIFT", "Lift from concourse", 66, 22, True),
    ("PL-ESC", "PLATFORM", "ESCALATOR", "Escalator from concourse", 50, 28, False),
    ("PL-STAIRS", "PLATFORM", "STAIRS", "Stairs from concourse", 34, 22, False),
    ("PL-1", "PLATFORM", "PLATFORM", "Platform 1", 28, 58, True),
    ("PL-2", "PLATFORM", "PLATFORM", "Platform 2", 72, 58, True),
    ("PL-WP", "PLATFORM", "WAYPOINT", "Platform waypoint", 50, 72, True),
]

EDGES = [
    ("ST-ENT", "ST-WP", "ENTRANCE", True),
    ("ST-WP", "ST-EXIT", "EXIT", True),
    ("ST-GATE", "ST-WP", "WALK", True),
    ("ST-BUS", "ST-ENT", "WALK", True),
    ("ST-PARK", "ST-EXIT", "WALK", True),
    ("ST-WP", "ST-STAIRS", "WALK", True),
    ("ST-WP", "ST-LIFT", "WALK", True),
    ("ST-STAIRS", "CC-STAIRS", "STAIRS", True),
    ("ST-LIFT", "CC-LIFT", "LIFT", True),
    ("CC-STAIRS", "CC-SEC", "WALK", True),
    ("CC-LIFT", "CC-SEC", "WALK", True),
    ("CC-LIFT", "CC-TICKET", "WALK", True),
    ("CC-SEC", "CC-TICKET", "WALK", True),
    ("CC-TICKET", "CC-AFC", "WALK", True),
    ("CC-SEC", "CC-AFC", "WALK", True),
    ("CC-AFC", "CC-HALL", "WALK", True),
    ("CC-HALL", "CC-FAC", "WALK", True),
    ("CC-HALL", "CC-IX", "INTERCHANGE", True),
    ("CC-HALL", "CC-WP", "WALK", True),
    ("CC-WP", "CC-STAIRS-P", "PLATFORM_ACCESS", True),
    ("CC-WP", "CC-ESC", "PLATFORM_ACCESS", True),
    ("CC-WP", "CC-LIFT-P", "PLATFORM_ACCESS", True),
    ("CC-STAIRS-P", "PL-STAIRS", "STAIRS", False),
    ("CC-ESC", "PL-ESC", "ESCALATOR", False),
    ("CC-LIFT-P", "PL-LIFT", "LIFT", True),
    ("PL-STAIRS", "PL-ACCESS", "WALK", True),
    ("PL-ESC", "PL-ACCESS", "WALK", True),
    ("PL-LIFT", "PL-ACCESS", "WALK", True),
    ("PL-ACCESS", "PL-WP", "WALK", True),
    ("PL-WP", "PL-1", "WALK", True),
    ("PL-WP", "PL-2", "WALK", True),
]


def _one(db: Session, model, **filters):
    return db.scalar(select(model).filter_by(**filters))


def _protected(row) -> bool:
    return getattr(row, "data_status", None) in PROTECTED or getattr(row, "verification_status", None) in PROTECTED


def _upsert(db: Session, model, unique: dict, values: dict):
    row = _one(db, model, **unique)
    if row is None:
        row = model(**unique, **values)
        db.add(row)
        db.flush()
        return row
    if _protected(row):
        return row
    for key, value in values.items():
        setattr(row, key, value)
    db.flush()
    return row


MINIMAL_NODES = [
    ("ST-ENT", "STREET", "ENTRANCE", "Entrance", 20, 80, True),
    ("ST-WP", "STREET", "WAYPOINT", "Waypoint", 50, 55, True),
    ("ST-EXIT", "STREET", "EXIT", "Exit", 80, 80, True),
    ("CC-HALL", "CONCOURSE", "CONCOURSE", "Concourse", 50, 50, True),
    ("CC-TICKET", "CONCOURSE", "TICKET_COUNTER", "Ticket counter", 22, 40, True),
    ("PL-1", "PLATFORM", "PLATFORM", "Platform 1", 50, 55, True),
]

MINIMAL_EDGES = [
    ("ST-ENT", "ST-WP", "ENTRANCE", True),
    ("ST-WP", "CC-HALL", "WALK", True),
    ("CC-HALL", "CC-TICKET", "WALK", True),
    ("CC-HALL", "PL-1", "WALK", True),
    ("ST-WP", "ST-EXIT", "EXIT", True),
]


def _seed_station_graph(db: Session, station: Station, node_defs: list, edge_defs: list, source_id: str | None, prune: bool) -> None:
    levels = {
        level.level_code: level
        for level in db.scalars(select(StationLevel).where(StationLevel.station_id == station.id)).all()
    }
    for code in ("STREET", "CONCOURSE", "PLATFORM"):
        if code not in levels:
            return
    note = "Schematic development layout for routing tests. Not a verified Hyderabad Metro floor plan."
    node_rows: dict[str, IndoorNode] = {}
    kept_nodes: set[str] = set()
    for code, level_code, node_type, name, x, y, accessible in node_defs:
        row = _upsert(
            db,
            IndoorNode,
            {"station_id": station.id, "node_code": code},
            {
                "level_id": levels[level_code].id,
                "node_type": node_type,
                "name": name,
                "description": None,
                "x": x,
                "y": y,
                "latitude": None,
                "longitude": None,
                "accessible": accessible,
                "data_status": "DEVELOPMENT",
                "verification_status": "DEVELOPMENT",
                "notes": note,
                "source_id": source_id,
            },
        )
        node_rows[code] = row
        kept_nodes.add(row.id)
    kept_edges: set[tuple[str, str, str]] = set()
    for from_code, to_code, connection_type, bidirectional in edge_defs:
        origin = node_rows[from_code]
        dest = node_rows[to_code]
        if origin.id == dest.id:
            continue
        accessible = origin.accessible and dest.accessible and connection_type in {
            "WALK", "LIFT", "ENTRANCE", "EXIT", "PLATFORM_ACCESS", "INTERCHANGE"
        }
        _upsert(
            db,
            IndoorEdge,
            {
                "station_id": station.id,
                "from_node_id": origin.id,
                "to_node_id": dest.id,
                "connection_type": connection_type,
            },
            {
                "distance_m": None,
                "estimated_time_sec": None,
                "accessible": accessible,
                "bidirectional": bidirectional,
                "data_status": "DEVELOPMENT",
                "verification_status": "DEVELOPMENT",
                "notes": note,
                "source_id": source_id,
            },
        )
        kept_edges.add((origin.id, dest.id, connection_type))
    for level in levels.values():
        _upsert(
            db,
            MapMetadata,
            {"station_id": station.id, "level_id": level.id, "map_type": "SCHEMATIC"},
            {
                "map_width": 100,
                "map_height": 100,
                "coordinate_system": "NORMALIZED_0_100",
                "map_version": "1",
                "data_status": "DEVELOPMENT",
                "verification_status": "DEVELOPMENT",
                "notes": note,
                "source_id": source_id,
            },
        )
    if not prune:
        db.flush()
        return
    for edge in db.scalars(select(IndoorEdge).where(IndoorEdge.station_id == station.id)).all():
        key = (edge.from_node_id, edge.to_node_id, edge.connection_type)
        if key not in kept_edges and not _protected(edge):
            db.delete(edge)
    db.flush()
    for node in db.scalars(select(IndoorNode).where(IndoorNode.station_id == station.id)).all():
        if node.id not in kept_nodes and not _protected(node):
            db.delete(node)
    db.flush()


def seed_ameerpet_indoor_map(db: Session, source_id: str | None = None) -> None:
    station = _one(db, Station, station_code="AMP")
    if station is None:
        raise ValueError("Ameerpet (AMP) must exist before Phase 4 indoor seed")
    _seed_station_graph(db, station, NODES, EDGES, source_id, prune=True)


def seed_development_indoor_maps(db: Session, source_id: str | None = None) -> None:
    seed_ameerpet_indoor_map(db, source_id)
    stations = db.scalars(select(Station).order_by(Station.station_code)).all()
    for station in stations:
        if station.station_code == "AMP":
            continue
        _seed_station_graph(db, station, MINIMAL_NODES, MINIMAL_EDGES, source_id, prune=True)
    seed_position_markers(db, source_id)


def seed_position_markers(db: Session, source_id: str | None = None) -> None:
    nodes = db.scalars(select(IndoorNode)).all()
    kept: set[str] = set()
    for node in nodes:
        station = db.get(Station, node.station_id)
        if station is None:
            continue
        code = f"MW-{station.station_code}-{node.node_code}"
        row = _upsert(
            db,
            PositionMarker,
            {"marker_code": code},
            {
                "station_id": station.id,
                "level_id": node.level_id,
                "node_id": node.id,
                "marker_type": "QR",
                "label": node.name,
                "status": "ACTIVE",
                "data_status": "DEVELOPMENT",
                "verification_status": "DEVELOPMENT",
                "notes": "Development QR marker mapped to an indoor node. Not a physical station installation.",
                "source_id": source_id,
            },
        )
        kept.add(row.id)
    for marker in db.scalars(select(PositionMarker)).all():
        if marker.id not in kept and not _protected(marker):
            db.delete(marker)
    db.flush()
