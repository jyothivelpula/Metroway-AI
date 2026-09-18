from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.indoor_service import require_station
from app.models import IndoorEdge, IndoorNode
from app.pathfinding import (
    GraphEdge,
    GraphNode,
    IndoorGraph,
    RouteError,
    astar,
    build_steps,
    new_route_id,
)


def _load_graph(db: Session, station_id: str) -> IndoorGraph:
    nodes = list(
        db.scalars(
            select(IndoorNode)
            .options(selectinload(IndoorNode.level))
            .where(IndoorNode.station_id == station_id)
        ).all()
    )
    edges = list(db.scalars(select(IndoorEdge).where(IndoorEdge.station_id == station_id)).all())
    graph = IndoorGraph()
    for node in nodes:
        graph.add_node(
            GraphNode(
                id=node.id,
                station_id=node.station_id,
                level_id=node.level_id,
                level_code=node.level.level_code if node.level else "",
                level_name=node.level.level_name if node.level else "",
                level_order=node.level.level_order if node.level else 0,
                node_code=node.node_code,
                node_type=node.node_type,
                name=node.name,
                x=node.x,
                y=node.y,
                accessible=node.accessible,
                data_status=node.data_status,
            )
        )
    node_ids = set(graph.nodes)
    for edge in edges:
        if edge.from_node_id not in node_ids or edge.to_node_id not in node_ids:
            continue
        if edge.from_node_id == edge.to_node_id:
            continue
        graph.add_edge(
            GraphEdge(
                id=edge.id,
                from_node_id=edge.from_node_id,
                to_node_id=edge.to_node_id,
                connection_type=edge.connection_type,
                distance_m=edge.distance_m,
                estimated_time_sec=edge.estimated_time_sec,
                accessible=edge.accessible,
                bidirectional=edge.bidirectional,
                data_status=edge.data_status,
            )
        )
    return graph


def _find_node(graph: IndoorGraph, token: str) -> GraphNode | None:
    key = token.strip()
    if key in graph.nodes:
        return graph.nodes[key]
    upper = key.upper()
    matches = [node for node in graph.nodes.values() if node.node_code.upper() == upper]
    if len(matches) == 1:
        return matches[0]
    return None


def _node_payload(node: GraphNode) -> dict:
    return {
        "node_id": node.id,
        "name": node.name,
        "node_type": node.node_type,
        "level": node.level_code,
        "node_code": node.node_code,
        "x": node.x,
        "y": node.y,
    }


def _edge_payload(edge: GraphEdge) -> dict:
    return {
        "edge_id": edge.id,
        "from_node_id": edge.from_node_id,
        "to_node_id": edge.to_node_id,
        "connection_type": edge.connection_type,
        "distance_m": edge.distance_m,
        "estimated_time_sec": edge.estimated_time_sec,
        "accessible": edge.accessible,
    }


def _sum_if_complete(edges: list[GraphEdge], field: str) -> float | int | None:
    values = [getattr(edge, field) for edge in edges]
    if not edges or any(value is None for value in values):
        return None
    return sum(values)


def plan_indoor_route(
    db: Session,
    *,
    station_id: str,
    start_node_id: str | None,
    destination_node_id: str,
    accessible_only: bool = False,
    current_node_id: str | None = None,
) -> dict:
    start_token = (start_node_id or current_node_id or "").strip()
    dest_token = destination_node_id.strip() if destination_node_id else ""
    if not station_id.strip():
        raise RouteError("INVALID_STATION", "Station is required", 400)
    if not start_token:
        raise RouteError("START_NODE_NOT_FOUND", "Start node is required", 400)
    if not dest_token:
        raise RouteError("DESTINATION_NODE_NOT_FOUND", "Destination node is required", 400)

    station = require_station(db, station_id)
    if station is None:
        raise RouteError("INVALID_STATION", "Station not found", 404)

    graph = _load_graph(db, station.id)
    if not graph.nodes:
        raise RouteError("INVALID_GRAPH", "Indoor graph is empty for this station", 400)

    start = _find_node(graph, start_token)
    dest = _find_node(graph, dest_token)
    if start is None:
        raise RouteError("START_NODE_NOT_FOUND", "Start node not found", 404)
    if dest is None:
        raise RouteError("DESTINATION_NODE_NOT_FOUND", "Destination node not found", 404)
    if start.station_id != station.id or dest.station_id != station.id:
        raise RouteError("NODES_FROM_DIFFERENT_STATIONS", "Start and destination must belong to the station", 400)

    path = astar(graph, start.id, dest.id, accessible_only=accessible_only)
    if not path:
        reason = "ACCESSIBLE_ROUTE_NOT_AVAILABLE" if accessible_only else "NO_PATH_AVAILABLE"
        return {
            "route_id": None,
            "station": {"id": station.id, "name": station.station_name},
            "start": {"node_id": start.id, "name": start.name},
            "destination": {"node_id": dest.id, "name": dest.name},
            "route_found": False,
            "reason": reason,
            "total_distance_m": None,
            "estimated_time_sec": None,
            "nodes": [],
            "edges": [],
            "steps": [],
        }

    ordered_nodes = [graph.nodes[node_id] for node_id, _edge in path]
    used_edges: list[GraphEdge] = []
    for index in range(1, len(path)):
        edge = path[index][1]
        if edge is None:
            raise RouteError("MISSING_EDGE", "Route is missing a connecting edge", 500)
        origin = ordered_nodes[index - 1]
        dest_node = ordered_nodes[index]
        expected = {origin.id, dest_node.id}
        if {edge.from_node_id, edge.to_node_id} != expected:
            raise RouteError("INVALID_NODE_REFERENCE", "Route edge does not match consecutive nodes", 500)
        if origin.station_id != station.id or dest_node.station_id != station.id:
            raise RouteError("NODES_FROM_DIFFERENT_STATIONS", "Route left the requested station", 500)
        used_edges.append(edge)

    return {
        "route_id": new_route_id(),
        "station": {"id": station.id, "name": station.station_name},
        "start": {"node_id": start.id, "name": start.name},
        "destination": {"node_id": dest.id, "name": dest.name},
        "route_found": True,
        "reason": None,
        "total_distance_m": _sum_if_complete(used_edges, "distance_m"),
        "estimated_time_sec": _sum_if_complete(used_edges, "estimated_time_sec"),
        "nodes": [_node_payload(node) for node in ordered_nodes],
        "edges": [_edge_payload(edge) for edge in used_edges],
        "steps": build_steps(ordered_nodes, used_edges),
    }
