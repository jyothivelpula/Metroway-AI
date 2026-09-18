from __future__ import annotations

from dataclasses import dataclass, field
from heapq import heappop, heappush
from math import atan2, degrees, hypot
from typing import Callable
from uuid import uuid4


class RouteError(Exception):
    def __init__(self, reason: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.reason = reason
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class GraphNode:
    id: str
    station_id: str
    level_id: str
    level_code: str
    level_name: str
    level_order: int
    node_code: str
    node_type: str
    name: str
    x: float | None
    y: float | None
    accessible: bool | None
    data_status: str


@dataclass(frozen=True)
class GraphEdge:
    id: str
    from_node_id: str
    to_node_id: str
    connection_type: str
    distance_m: float | None
    estimated_time_sec: int | None
    accessible: bool | None
    bidirectional: bool
    data_status: str


@dataclass
class IndoorGraph:
    nodes: dict[str, GraphNode] = field(default_factory=dict)
    outgoing: dict[str, list[tuple[GraphEdge, str]]] = field(default_factory=dict)

    def add_node(self, node: GraphNode) -> None:
        self.nodes[node.id] = node
        self.outgoing.setdefault(node.id, [])

    def add_edge(self, edge: GraphEdge) -> None:
        if edge.from_node_id not in self.nodes or edge.to_node_id not in self.nodes:
            return
        self.outgoing.setdefault(edge.from_node_id, []).append((edge, edge.to_node_id))
        if edge.bidirectional:
            reverse = GraphEdge(
                id=edge.id,
                from_node_id=edge.to_node_id,
                to_node_id=edge.from_node_id,
                connection_type=edge.connection_type,
                distance_m=edge.distance_m,
                estimated_time_sec=edge.estimated_time_sec,
                accessible=edge.accessible,
                bidirectional=True,
                data_status=edge.data_status,
            )
            self.outgoing.setdefault(edge.to_node_id, []).append((reverse, edge.from_node_id))


def is_verified_accessible(flag: bool | None) -> bool:
    return flag is True


def edge_traversal_cost(edge: GraphEdge, origin: GraphNode, dest: GraphNode) -> float:
    if edge.estimated_time_sec is not None:
        return float(edge.estimated_time_sec)
    if edge.distance_m is not None:
        return float(edge.distance_m)
    if origin.x is not None and origin.y is not None and dest.x is not None and dest.y is not None:
        return hypot(dest.x - origin.x, dest.y - origin.y)
    return 1.0


def heuristic(node: GraphNode, goal: GraphNode) -> float:
    if node.x is None or node.y is None or goal.x is None or goal.y is None:
        return 0.0
    return hypot(goal.x - node.x, goal.y - node.y)


def astar(
    graph: IndoorGraph,
    start_id: str,
    goal_id: str,
    *,
    accessible_only: bool = False,
    cost_fn: Callable[[GraphEdge, GraphNode, GraphNode], float] = edge_traversal_cost,
    heuristic_fn: Callable[[GraphNode, GraphNode], float] = heuristic,
) -> list[tuple[str, GraphEdge | None]]:
    if start_id not in graph.nodes or goal_id not in graph.nodes:
        return []
    start = graph.nodes[start_id]
    goal = graph.nodes[goal_id]
    if accessible_only and (not is_verified_accessible(start.accessible) or not is_verified_accessible(goal.accessible)):
        return []
    if start_id == goal_id:
        return [(start_id, None)]

    counter = 0
    open_heap: list[tuple[float, int, str]] = [(heuristic_fn(start, goal), counter, start_id)]
    g_score = {start_id: 0.0}
    came_from: dict[str, tuple[str, GraphEdge]] = {}
    closed: set[str] = set()

    while open_heap:
        _f, _, current_id = heappop(open_heap)
        if current_id in closed:
            continue
        if current_id == goal_id:
            return _reconstruct(came_from, current_id)
        closed.add(current_id)
        current = graph.nodes[current_id]
        for edge, neighbor_id in graph.outgoing.get(current_id, []):
            neighbor = graph.nodes[neighbor_id]
            if accessible_only:
                if not is_verified_accessible(edge.accessible):
                    continue
                if not is_verified_accessible(neighbor.accessible):
                    continue
            tentative = g_score[current_id] + cost_fn(edge, current, neighbor)
            if tentative >= g_score.get(neighbor_id, float("inf")):
                continue
            came_from[neighbor_id] = (current_id, edge)
            g_score[neighbor_id] = tentative
            counter += 1
            f_score = tentative + heuristic_fn(neighbor, goal)
            heappush(open_heap, (f_score, counter, neighbor_id))
    return []


def _reconstruct(came_from: dict[str, tuple[str, GraphEdge]], current_id: str) -> list[tuple[str, GraphEdge | None]]:
    node_ids = [current_id]
    edges_rev: list[GraphEdge] = []
    while current_id in came_from:
        previous_id, edge = came_from[current_id]
        edges_rev.append(edge)
        node_ids.append(previous_id)
        current_id = previous_id
    node_ids.reverse()
    edges_rev.reverse()
    ordered: list[tuple[str, GraphEdge | None]] = [(node_ids[0], None)]
    for node_id, edge in zip(node_ids[1:], edges_rev):
        ordered.append((node_id, edge))
    return ordered


def turn_label(prev: GraphNode, current: GraphNode, nxt: GraphNode) -> str | None:
    if None in (prev.x, prev.y, current.x, current.y, nxt.x, nxt.y):
        return None
    ax, ay = current.x - prev.x, current.y - prev.y  # type: ignore[operator]
    bx, by = nxt.x - current.x, nxt.y - current.y  # type: ignore[operator]
    if hypot(ax, ay) < 0.5 or hypot(bx, by) < 0.5:
        return "STRAIGHT"
    cross = ax * by - ay * bx
    dot = ax * bx + ay * by
    angle = abs(degrees(atan2(cross, dot)))
    if angle < 25:
        return "STRAIGHT"
    if angle < 55:
        return "SLIGHT_LEFT" if cross < 0 else "SLIGHT_RIGHT"
    if cross < 0:
        return "LEFT"
    return "RIGHT"


def _distance_phrase(distance_m: float | None) -> str | None:
    if distance_m is None:
        return None
    value = int(distance_m) if float(distance_m).is_integer() else distance_m
    return f"{value} m"


def voice_instruction_from(text: str) -> str:
    if not text:
        return ""
    return text.replace(" m.", " meters.").replace(" m ", " meters ")


def instruction_for_edge(
    origin: GraphNode,
    dest: GraphNode,
    edge: GraphEdge,
    previous: GraphNode | None,
) -> dict:
    level_change = origin.level_id != dest.level_id
    action = "GO_STRAIGHT"
    distance_phrase = _distance_phrase(edge.distance_m)
    if distance_phrase:
        text = f"Walk straight for {distance_phrase}."
    else:
        text = f"Continue toward {dest.name}."
    connection = edge.connection_type
    landmark = None

    if connection == "STAIRS" or (level_change and connection == "STAIRS"):
        action = "TAKE_STAIRS"
        direction = "up" if dest.level_order > origin.level_order else "down"
        text = f"Take the stairs {direction} to the {dest.level_name}."
    elif connection == "ESCALATOR":
        action = "TAKE_ESCALATOR"
        direction = "up" if dest.level_order > origin.level_order else "down"
        text = f"Take the escalator {direction} to the {dest.level_name}."
    elif connection == "LIFT":
        action = "TAKE_LIFT"
        text = f"Take the lift to the {dest.level_name}."
    elif connection == "ENTRANCE":
        action = "ENTER"
        text = f"Enter toward {dest.name}."
        if distance_phrase:
            text = f"Enter toward {dest.name}. Walk {distance_phrase}."
    elif connection == "EXIT":
        action = "EXIT"
        text = f"Go toward {dest.name} to exit."
    elif connection == "PLATFORM_ACCESS":
        action = "FOLLOW_PLATFORM_SIGN"
        text = f"Use platform access toward {dest.name}."
    elif connection == "INTERCHANGE":
        action = "FOLLOW_LINE_SIGN"
        text = f"Walk to the interchange at {dest.name}."
    elif previous is not None and origin.level_id == dest.level_id:
        turn = turn_label(previous, origin, dest)
        if turn == "LEFT":
            action = "TURN_LEFT"
            text = f"Turn left toward {dest.name}."
        elif turn == "RIGHT":
            action = "TURN_RIGHT"
            text = f"Turn right toward {dest.name}."
        elif turn == "SLIGHT_LEFT":
            action = "SLIGHT_LEFT"
            text = f"Bear left toward {dest.name}."
        elif turn == "SLIGHT_RIGHT":
            action = "SLIGHT_RIGHT"
            text = f"Bear right toward {dest.name}."
        elif turn == "STRAIGHT":
            action = "GO_STRAIGHT"
            text = f"Walk straight for {distance_phrase}." if distance_phrase else "Walk straight."

    if level_change and action not in {"TAKE_STAIRS", "TAKE_ESCALATOR", "TAKE_LIFT"}:
        action = "GO_UP" if dest.level_order > origin.level_order else "GO_DOWN"
        text = f"Go to the {dest.level_name} toward {dest.name}."

    return {
        "action": action,
        "instruction_type": action,
        "instruction_text": text,
        "text": text,
        "from_node_id": origin.id,
        "to_node_id": dest.id,
        "from_node": origin.name,
        "to_node": dest.name,
        "connection_type": connection,
        "level": dest.level_code,
        "distance_m": edge.distance_m,
        "estimated_time_sec": edge.estimated_time_sec,
        "landmark": landmark,
        "sign_text": None,
        "voice_instruction": voice_instruction_from(text),
    }


def _annotate_steps(steps: list[dict]) -> list[dict]:
    for index, step in enumerate(steps, start=1):
        step["step_index"] = index
        step.setdefault("instruction_type", step.get("action"))
        step.setdefault("instruction_text", step.get("text"))
        step.setdefault("from_node", None)
        step.setdefault("to_node", None)
        step.setdefault("distance_m", None)
        step.setdefault("estimated_time_sec", None)
        step.setdefault("landmark", None)
        step.setdefault("sign_text", None)
        step.setdefault("voice_instruction", voice_instruction_from(step.get("instruction_text") or step.get("text") or ""))
    return steps


def build_steps(nodes: list[GraphNode], edges: list[GraphEdge]) -> list[dict]:
    if not nodes:
        return []
    start = nodes[0]
    steps = [
        {
            "action": "START",
            "instruction_type": "START",
            "instruction_text": "Start your navigation here.",
            "text": f"Start at {start.name}.",
            "from_node_id": None,
            "to_node_id": start.id,
            "from_node": None,
            "to_node": start.name,
            "connection_type": None,
            "level": start.level_code,
            "distance_m": None,
            "estimated_time_sec": None,
            "landmark": None,
            "sign_text": None,
            "voice_instruction": "Start your navigation here.",
        }
    ]
    for index, edge in enumerate(edges):
        origin = nodes[index]
        dest = nodes[index + 1]
        previous = nodes[index - 1] if index > 0 else None
        steps.append(instruction_for_edge(origin, dest, edge, previous))
    finish = nodes[-1]
    steps.append(
        {
            "action": "ARRIVE",
            "instruction_type": "ARRIVE",
            "instruction_text": f"You have arrived at {finish.name}.",
            "text": f"Arrive at {finish.name}.",
            "from_node_id": finish.id if len(nodes) == 1 else nodes[-2].id,
            "to_node_id": finish.id,
            "from_node": finish.name if len(nodes) == 1 else nodes[-2].name,
            "to_node": finish.name,
            "connection_type": None,
            "level": finish.level_code,
            "distance_m": None,
            "estimated_time_sec": None,
            "landmark": None,
            "sign_text": None,
            "voice_instruction": f"You have arrived at {finish.name}.",
        }
    )
    return _annotate_steps(steps)


def check_user_on_route(route_node_ids: list[str], current_node_id: str | None) -> str:
    if not current_node_id:
        return "UNKNOWN"
    if current_node_id in route_node_ids:
        return "ON_ROUTE"
    return "OFF_ROUTE"


def new_route_id() -> str:
    return str(uuid4())
