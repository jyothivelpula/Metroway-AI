from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Line, Station, StationConnection
from app.services import find_line, find_station, list_stations, station_is_interchange


def _line_edges(db: Session, line_id: str) -> list[StationConnection]:
    return list(
        db.scalars(
            select(StationConnection)
            .options(
                selectinload(StationConnection.from_station),
                selectinload(StationConnection.to_station),
            )
            .where(StationConnection.line_id == line_id)
            .order_by(StationConnection.sequence_order, StationConnection.sequence_from)
        ).all()
    )


def _ordered_stations(edges: list[StationConnection]) -> list[Station]:
    if not edges:
        return []
    stations = [edges[0].from_station]
    for edge in edges:
        stations.append(edge.to_station)
    return stations


def _station_ref(station: Station) -> dict:
    return {
        "id": station.id,
        "station_code": station.station_code,
        "name": station.station_name,
        "alternate_name": station.alternate_name,
        "is_interchange": station_is_interchange(station),
    }


def _line_payload(db: Session, line: Line) -> dict:
    edges = _line_edges(db, line.id)
    stations = _ordered_stations(edges)
    rows = []
    last_index = len(stations) - 1
    for index, station in enumerate(stations):
        rows.append(
            {
                "id": station.id,
                "station_code": station.station_code,
                "name": station.station_name,
                "sequence": index + 1,
                "is_interchange": station_is_interchange(station),
                "is_terminal": index in (0, last_index) and last_index >= 0,
                "verification_status": station.verification_status,
                "alternate_name": station.alternate_name,
            }
        )
    connections = [
        {
            "from_station_id": edge.from_station_id,
            "from_station_name": edge.from_station.station_name,
            "to_station_id": edge.to_station_id,
            "to_station_name": edge.to_station.station_name,
            "sequence_from": edge.sequence_from,
            "sequence_to": edge.sequence_to,
            "connection_type": edge.connection_type,
            "direction": edge.direction,
            "is_interchange": edge.is_interchange,
            "is_terminal": edge.is_terminal,
            "verification_status": edge.verification_status,
        }
        for edge in edges
    ]
    return {
        "id": line.id,
        "code": line.line_code,
        "name": line.line_name,
        "display_name": line.display_name,
        "origin_station": rows[0]["name"] if rows else None,
        "terminal_station": rows[-1]["name"] if rows else None,
        "verification_status": "DEVELOPMENT",
        "stations": rows,
        "connections": connections,
    }


def get_network(db: Session) -> dict:
    lines = db.scalars(select(Line).order_by(Line.line_code)).all()
    return {"verification_status": "DEVELOPMENT", "lines": [_line_payload(db, line) for line in lines]}


def get_line_network(db: Session, line: Line) -> dict:
    payload = _line_payload(db, line)
    payload["interchange_stations"] = [row for row in payload["stations"] if row["is_interchange"]]
    return payload


def get_station_neighborhood(db: Session, station: Station) -> dict:
    connections = []
    for link in sorted(station.line_links, key=lambda item: item.line.line_code):
        line = link.line
        ordered = _ordered_stations(_line_edges(db, line.id))
        index = next((i for i, row in enumerate(ordered) if row.id == station.id), None)
        previous_station = ordered[index - 1] if index not in (None, 0) else None
        next_station = ordered[index + 1] if index is not None and index + 1 < len(ordered) else None
        if index is None:
            continue
        if next_station:
            connection_type = "NEXT_STATION"
        elif previous_station:
            connection_type = "PREVIOUS_STATION"
        else:
            connection_type = "INTERCHANGE" if station_is_interchange(station) else "TERMINAL"
        connections.append(
            {
                "line": line.line_name,
                "line_id": line.id,
                "previous_station": _station_ref(previous_station) if previous_station else None,
                "next_station": _station_ref(next_station) if next_station else None,
                "direction": (
                    f"{ordered[0].station_name} → {ordered[-1].station_name}" if ordered else None
                ),
                "connection_type": connection_type,
                "verification_status": "DEVELOPMENT",
            }
        )
    return {
        "station": station.station_name,
        "station_id": station.id,
        "verification_status": station.verification_status,
        "connections": connections,
    }


def get_interchanges(db: Session) -> dict:
    rows = []
    for station in list_stations(db):
        if not station_is_interchange(station):
            continue
        rows.append(
            {
                "station_id": station.id,
                "station_code": station.station_code,
                "station_name": station.station_name,
                "lines": [link.line.line_name for link in sorted(station.line_links, key=lambda item: item.line.line_code)],
                "verification_status": station.verification_status,
                "alternate_name": station.alternate_name,
            }
        )
    return {"interchanges": rows}


def get_terminals(db: Session) -> list[dict]:
    lines = db.scalars(select(Line).order_by(Line.line_code)).all()
    rows = []
    for line in lines:
        ordered = _ordered_stations(_line_edges(db, line.id))
        origin = ordered[0] if ordered else None
        terminal = ordered[-1] if ordered else None
        rows.append(
            {
                "line": line.line_name,
                "line_id": line.id,
                "origin": origin.station_name if origin else None,
                "terminal": terminal.station_name if terminal else None,
                "origin_station_id": origin.id if origin else None,
                "terminal_station_id": terminal.id if terminal else None,
                "verification_status": "DEVELOPMENT",
            }
        )
    return rows


def require_line(db: Session, line_id: str) -> Line | None:
    if not line_id or not line_id.strip():
        return None
    return find_line(db, line_id)


def require_station(db: Session, station_id: str) -> Station | None:
    if not station_id or not station_id.strip():
        return None
    return find_station(db, station_id)
