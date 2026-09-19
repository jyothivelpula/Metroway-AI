from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.indoor_service import require_station
from app.models import IndoorEdge, IndoorNode, PositionMarker, StationLevel
from app.pathfinding import match_position_to_route

QR_TYPE = "METROWAY_POSITION"
QR_VERSION = 1


def _public_marker(marker: PositionMarker) -> dict:
    node = marker.node
    level = marker.level
    station = marker.station
    return {
        "id": marker.id,
        "marker_code": marker.marker_code,
        "marker_type": marker.marker_type,
        "label": marker.label,
        "status": marker.status,
        "station": {"id": station.id, "name": station.station_name, "station_code": station.station_code},
        "level": {"id": level.id, "code": level.level_code, "name": level.level_name} if level else None,
        "node": {"id": node.id, "name": node.name, "node_code": node.node_code, "node_type": node.node_type} if node else None,
    }


def list_station_markers(db: Session, station_id: str) -> dict | None:
    station = require_station(db, station_id)
    if station is None:
        return None
    markers = db.scalars(
        select(PositionMarker)
        .options(selectinload(PositionMarker.node), selectinload(PositionMarker.level), selectinload(PositionMarker.station))
        .where(PositionMarker.station_id == station.id, PositionMarker.status == "ACTIVE")
        .order_by(PositionMarker.marker_code)
    ).all()
    return {"station": {"id": station.id, "name": station.station_name}, "markers": [_public_marker(item) for item in markers]}


def get_marker_by_code(db: Session, marker_code: str) -> PositionMarker | None:
    return db.scalar(
        select(PositionMarker)
        .options(selectinload(PositionMarker.node), selectinload(PositionMarker.level), selectinload(PositionMarker.station))
        .where(PositionMarker.marker_code == marker_code.strip())
    )


def _token_matches_station(station, token: str) -> bool:
    key = token.strip()
    if not key:
        return False
    if key == station.id:
        return True
    if key.upper() == station.station_code.upper():
        return True
    if station.alternate_name and key.lower() == station.alternate_name.lower():
        return True
    return False


def _token_matches_level(level: StationLevel | None, token: str | None) -> bool:
    if not token:
        return True
    if level is None:
        return False
    key = token.strip()
    return key == level.id or key.upper() == level.level_code.upper()


def _token_matches_node(node: IndoorNode | None, token: str | None) -> bool:
    if not token:
        return True
    if node is None:
        return False
    key = token.strip()
    return key == node.id or key.upper() == node.node_code.upper()


def resolve_position(db: Session, *, marker_code: str | None, payload: dict | None) -> dict:
    code = (marker_code or "").strip()
    data = payload if isinstance(payload, dict) else None
    if data:
        if data.get("type") != QR_TYPE:
            return {"valid": False, "reason": "INVALID_QR_TYPE", "source": "QR_POSITION"}
        try:
            version = int(data.get("version"))
        except (TypeError, ValueError):
            return {"valid": False, "reason": "INVALID_QR_VERSION", "source": "QR_POSITION"}
        if version != QR_VERSION:
            return {"valid": False, "reason": "INVALID_QR_VERSION", "source": "QR_POSITION"}
        code = str(data.get("markerId") or data.get("marker_id") or code).strip()
    if not code:
        return {"valid": False, "reason": "POSITION_MARKER_NOT_FOUND", "source": "QR_POSITION"}

    marker = get_marker_by_code(db, code)
    if marker is None or marker.status != "ACTIVE":
        return {"valid": False, "reason": "POSITION_MARKER_NOT_FOUND", "source": "QR_POSITION"}
    if marker.node is None or marker.level is None or marker.station is None:
        return {"valid": False, "reason": "POSITION_MARKER_NOT_FOUND", "source": "QR_POSITION"}
    if marker.node.station_id != marker.station_id or marker.level.station_id != marker.station_id:
        return {"valid": False, "reason": "POSITION_MARKER_MISMATCH", "source": "QR_POSITION"}
    if data:
        station_token = str(data.get("stationId") or data.get("station_id") or "")
        level_token = str(data.get("levelId") or data.get("level_id") or "")
        node_token = str(data.get("nodeId") or data.get("node_id") or "")
        if station_token and not _token_matches_station(marker.station, station_token):
            return {"valid": False, "reason": "POSITION_MARKER_MISMATCH", "source": "QR_POSITION"}
        if level_token and not _token_matches_level(marker.level, level_token):
            return {"valid": False, "reason": "POSITION_MARKER_MISMATCH", "source": "QR_POSITION"}
        if node_token and not _token_matches_node(marker.node, node_token):
            return {"valid": False, "reason": "POSITION_MARKER_MISMATCH", "source": "QR_POSITION"}

    return {
        "valid": True,
        "source": "QR_POSITION",
        "stationId": marker.station.id,
        "stationName": marker.station.station_name,
        "stationCode": marker.station.station_code,
        "levelId": marker.level.id,
        "levelCode": marker.level.level_code,
        "levelName": marker.level.level_name,
        "nodeId": marker.node.id,
        "nodeName": marker.node.name,
        "nodeCode": marker.node.node_code,
        "markerId": marker.marker_code,
        "confidence": "HIGH",
        "latitude": None,
        "longitude": None,
        "accuracy": None,
    }


def neighbor_ids_for_route(db: Session, station_id: str, route_node_ids: list[str]) -> set[str]:
    if not route_node_ids:
        return set()
    route = set(route_node_ids)
    neighbors: set[str] = set()
    edges = db.scalars(select(IndoorEdge).where(IndoorEdge.station_id == station_id)).all()
    for edge in edges:
        if edge.from_node_id in route and edge.to_node_id not in route:
            neighbors.add(edge.to_node_id)
        if edge.to_node_id in route and edge.from_node_id not in route:
            neighbors.add(edge.from_node_id)
    return neighbors


def detect_off_route(current_node_id: str | None, route_node_ids: list[str], destination_node_id: str | None, neighbor_ids: set[str]) -> str:
    return match_position_to_route(
        current_node_id,
        route_node_ids,
        destination_node_id=destination_node_id,
        neighbor_node_ids=neighbor_ids,
    )
