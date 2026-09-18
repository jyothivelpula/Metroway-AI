from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import IndoorEdge, IndoorNode, MapMetadata, Station, StationLevel
from app.services import find_station


def require_station(db: Session, station_id: str) -> Station | None:
    if not station_id or not station_id.strip():
        return None
    return find_station(db, station_id)


def require_level(db: Session, station: Station, level_id: str) -> StationLevel | None:
    if not level_id or not level_id.strip():
        return None
    key = level_id.strip()
    return db.scalar(
        select(StationLevel).where(
            StationLevel.station_id == station.id,
            or_(StationLevel.id == key, StationLevel.level_code == key.upper()),
        )
    )


def _levels(db: Session, station_id: str) -> list[StationLevel]:
    return list(
        db.scalars(
            select(StationLevel).where(StationLevel.station_id == station_id).order_by(StationLevel.level_order)
        ).all()
    )


def _nodes(db: Session, station_id: str, level_id: str | None = None) -> list[IndoorNode]:
    stmt = select(IndoorNode).where(IndoorNode.station_id == station_id)
    if level_id:
        stmt = stmt.where(IndoorNode.level_id == level_id)
    return list(db.scalars(stmt.order_by(IndoorNode.node_code)).all())


def _edges(db: Session, station_id: str, node_ids: set[str] | None = None) -> list[IndoorEdge]:
    stmt = (
        select(IndoorEdge)
        .options(selectinload(IndoorEdge.from_node), selectinload(IndoorEdge.to_node))
        .where(IndoorEdge.station_id == station_id)
    )
    edges = list(db.scalars(stmt).all())
    if node_ids is None:
        return edges
    return [edge for edge in edges if edge.from_node_id in node_ids and edge.to_node_id in node_ids]


def _metadata(db: Session, station_id: str, level_id: str | None = None) -> list[MapMetadata]:
    stmt = select(MapMetadata).where(MapMetadata.station_id == station_id)
    if level_id:
        stmt = stmt.where(MapMetadata.level_id == level_id)
    return list(db.scalars(stmt).all())


def _node_out(node: IndoorNode) -> dict:
    return {
        "id": node.id,
        "station_id": node.station_id,
        "level_id": node.level_id,
        "node_code": node.node_code,
        "node_type": node.node_type,
        "name": node.name,
        "description": node.description,
        "x": node.x,
        "y": node.y,
        "latitude": node.latitude,
        "longitude": node.longitude,
        "accessible": node.accessible,
        "data_status": node.data_status,
    }


def _edge_out(edge: IndoorEdge) -> dict:
    return {
        "id": edge.id,
        "station_id": edge.station_id,
        "from_node_id": edge.from_node_id,
        "to_node_id": edge.to_node_id,
        "connection_type": edge.connection_type,
        "distance_m": edge.distance_m,
        "estimated_time_sec": edge.estimated_time_sec,
        "accessible": edge.accessible,
        "bidirectional": edge.bidirectional,
        "data_status": edge.data_status,
    }


def _meta_out(row: MapMetadata) -> dict:
    return {
        "id": row.id,
        "station_id": row.station_id,
        "level_id": row.level_id,
        "map_type": row.map_type,
        "map_width": row.map_width,
        "map_height": row.map_height,
        "coordinate_system": row.coordinate_system,
        "map_version": row.map_version,
        "data_status": row.data_status,
    }


def get_indoor_map(db: Session, station: Station, level: StationLevel | None = None) -> dict:
    levels = _levels(db, station.id)
    nodes = _nodes(db, station.id, level.id if level else None)
    node_ids = {node.id for node in nodes}
    edges = _edges(db, station.id, node_ids if level else None)
    metadata = _metadata(db, station.id, level.id if level else None)
    return {
        "station": {"id": station.id, "name": station.station_name, "station_code": station.station_code},
        "levels": [
            {"id": item.id, "code": item.level_code, "name": item.level_name, "level_order": item.level_order}
            for item in levels
        ],
        "nodes": [_node_out(node) for node in nodes],
        "edges": [_edge_out(edge) for edge in edges],
        "map_metadata": [_meta_out(row) for row in metadata],
    }


def list_indoor_nodes(db: Session, station: Station) -> list[dict]:
    return [_node_out(node) for node in _nodes(db, station.id)]


def list_indoor_edges(db: Session, station: Station) -> list[dict]:
    return [_edge_out(edge) for edge in _edges(db, station.id)]


def list_map_metadata(db: Session, station: Station) -> list[dict]:
    return [_meta_out(row) for row in _metadata(db, station.id)]
