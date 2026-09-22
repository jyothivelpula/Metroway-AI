from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.im_lost_interpret import extract_with_ai, interpret_sign_text
from app.models import IndoorNode, Station


def station_names(db: Session) -> list[str]:
    names: list[str] = []
    for station in db.scalars(select(Station)).all():
        names.extend([v for v in (station.station_name, station.station_code, station.alternate_name) if v])
    return names


def _norm(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()


def find_station(db: Session, token: str | None) -> Station | None:
    if not token:
        return None
    key = _norm(token)
    for station in db.scalars(select(Station).options(selectinload(Station.indoor_nodes).selectinload(IndoorNode.level))).all():
        aliases = [_norm(v) for v in (station.station_name, station.station_code, station.alternate_name, station.id) if v]
        if key in aliases:
            return station
    return None


def _platform_num(name: str) -> str | None:
    match = re.search(r"(\d{1,2})", name or "")
    return match.group(1).zfill(2) if match else None


def _node_public(node: IndoorNode, station: Station) -> dict:
    level = node.level
    return {
        "id": node.id,
        "node_id": node.id,
        "node_code": node.node_code,
        "name": node.name,
        "node_type": node.node_type,
        "level_id": node.level_id,
        "level_code": level.level_code if level else None,
        "level_name": level.level_name if level else None,
        "station_id": station.id,
        "station_code": station.station_code,
        "station_name": station.station_name,
        "label": f"{station.station_name} — {node.name}",
    }


def _station_public(station: Station | None) -> dict | None:
    if not station:
        return None
    return {
        "id": station.id,
        "station_id": station.id,
        "station_code": station.station_code,
        "station_name": station.station_name,
        "alternate_name": station.alternate_name,
    }


def empty_result(*, status: str, confidence: str, title: str, explanation: str, interpretation: dict | None = None) -> dict:
    return {
        "status": status,
        "confidence": confidence,
        "title": title,
        "summary": None,
        "explanation": explanation,
        "recognized_text": (interpretation or {}).get("raw_text"),
        "interpretation": interpretation,
        "station": None,
        "station_id": None,
        "level_id": None,
        "node_id": None,
        "node": None,
        "candidates": [],
        "clarification_options": [],
        "next_action": {"type": "NEEDS_MANUAL_LOCATION", "instruction": "Choose your location, or try another photo."},
        "can_continue": False,
    }


def match_interpretation(db: Session, interpretation: dict, station_token: str | None = None) -> dict:
    hinted = find_station(db, station_token) or find_station(db, interpretation.get("station_hint"))
    stations = list(db.scalars(select(Station).options(selectinload(Station.indoor_nodes).selectinload(IndoorNode.level))).all())

    if not hinted and interpretation.get("platform_hint"):
        wanted = interpretation["platform_hint"].replace("P", "").zfill(2)
        hits = []
        for station in stations:
            if any(
                node.node_type == "PLATFORM" and _platform_num(node.name) == wanted
                for node in station.indoor_nodes
            ):
                hits.append(station)
        if len(hits) == 1:
            hinted = hits[0]
        elif len(hits) > 1:
            return {
                **empty_result(
                    status="NEEDS_MANUAL_LOCATION",
                    confidence="MEDIUM",
                    title="Which station are you in?",
                    explanation="I can see a platform sign, but more than one station could match. Choose your station.",
                    interpretation=interpretation,
                ),
                "candidates": [_station_public(item) | {"label": item.station_name, "kind": "station"} for item in hits[:8]],
                "clarification_options": [item.station_name for item in hits[:8]],
            }

    if not hinted:
        if interpretation.get("direction_hint") and not interpretation.get("station_hint"):
            return empty_result(
                status="NEEDS_MANUAL_LOCATION",
                confidence="LOW",
                title="I need one more detail.",
                explanation="Those look like destination signs. Which Hyderabad Metro station are you standing in?",
                interpretation=interpretation,
            )
        if interpretation.get("type") not in {None, "UNKNOWN", "DIRECTION"}:
            return {
                **empty_result(
                    status="NEEDS_MANUAL_LOCATION",
                    confidence="LOW",
                    title="I can see that, but I need one more detail.",
                    explanation="What else can you see?",
                    interpretation=interpretation,
                ),
                "clarification_options": ["Lift", "Escalator", "Ticket counter", "Gate / Exit", "Platform direction"],
            }
        return empty_result(
            status="NO_MATCH",
            confidence="UNKNOWN",
            title="We’re not confident enough to determine your exact location.",
            explanation="Nothing in MetroWay’s verified station data matched that information. Try another photo, describe what you see, or choose your location.",
            interpretation=interpretation,
        )

    station = hinted
    ranked = _rank(station, interpretation)
    if not ranked:
        recognized = interpretation.get("platform_hint") or interpretation.get("type") or "that sign"
        return {
            **empty_result(
                status="PARTIAL_MATCH",
                confidence="LOW",
                title="We recognized the sign, but not an exact indoor spot.",
                explanation=(
                    f"We recognized ‘{recognized}’, but we don't have enough verified information "
                    "to determine your exact position."
                ),
                interpretation=interpretation,
            ),
            "station": _station_public(station),
            "station_id": station.alternate_name or station.station_code,
            "summary": station.station_name,
        }

    top = ranked[0][0]
    tied = [row[1] for row in ranked if row[0] == top]
    if len(tied) > 1:
        return {
            **empty_result(
                status="NEEDS_MANUAL_LOCATION",
                confidence="MEDIUM",
                title="I found more than one nearby match.",
                explanation="Choose the indoor spot that looks right.",
                interpretation=interpretation,
            ),
            "station": _station_public(station),
            "station_id": station.alternate_name or station.station_code,
            "candidates": [_node_public(node, station) | {"kind": "node"} for node in tied[:6]],
            "clarification_options": [node.name for node in tied[:6]],
        }

    node = tied[0]
    score = top
    if score >= 16:
        status, confidence = "MATCH_FOUND", "HIGH"
        title = "We found a likely match"
    elif score >= 10:
        status, confidence = "MATCH_FOUND", "MEDIUM"
        title = "We found a likely match"
    else:
        status, confidence = "LOW_CONFIDENCE", "LOW"
        title = "We’re not confident enough to determine your exact location."
    summary_parts = [station.station_name, node.name]
    if interpretation.get("direction_hint"):
        summary_parts.append(f"Towards {interpretation['direction_hint']}")
    summary = " — ".join(summary_parts[:2]) if not interpretation.get("direction_hint") else f"{node.name} — Towards {interpretation['direction_hint']}"
    instruction = f"Continue indoor navigation from {station.station_name}, {node.name}."
    if interpretation.get("direction_hint"):
        instruction = f"Follow signs toward {interpretation['direction_hint']} from {node.name}."
    can_continue = status == "MATCH_FOUND"
    return {
        "status": status,
        "confidence": confidence,
        "title": title,
        "summary": summary,
        "explanation": _explain(station, node, interpretation, confidence),
        "recognized_text": interpretation.get("raw_text"),
        "interpretation": interpretation,
        "station": _station_public(station),
        "station_id": station.alternate_name or station.station_code,
        "level_id": node.level_id,
        "node_id": node.id,
        "node": _node_public(node, station),
        "candidates": [_node_public(item[1], station) | {"kind": "node"} for item in ranked[1:4]],
        "clarification_options": [],
        "next_action": {
            "type": "CONTINUE_NAVIGATION" if can_continue else "NEEDS_MANUAL_LOCATION",
            "instruction": instruction if can_continue else "Try another photo or choose your location.",
        },
        "can_continue": can_continue,
    }


def _rank(station: Station, interpretation: dict) -> list[tuple[int, IndoorNode]]:
    wanted_platform = (interpretation.get("platform_hint") or "").replace("P", "").zfill(2) if interpretation.get("platform_hint") else None
    sign_type = interpretation.get("type")
    scored = []
    for node in station.indoor_nodes:
        score = 0
        if wanted_platform and node.node_type == "PLATFORM" and _platform_num(node.name) == wanted_platform:
            score += 18
        if sign_type == "TICKET_COUNTER" and node.node_type == "TICKET_COUNTER":
            score += 16
        if sign_type == "LIFT" and node.node_type == "LIFT":
            score += 12
        if sign_type == "ESCALATOR" and node.node_type == "ESCALATOR":
            score += 12
        if sign_type == "STAIRS" and node.node_type == "STAIRS":
            score += 10
        if sign_type == "CONCOURSE" and node.node_type == "CONCOURSE":
            score += 14
        if sign_type in {"EXIT", "GATE"} and node.node_type in {"EXIT", "GATE", "AFC_GATE"}:
            score += 12
        if sign_type == "BUS_STOP" and node.node_type == "BUS_STOP":
            score += 14
        if sign_type == "FACILITY" and node.node_type == "FACILITY":
            score += 12
        if sign_type == "STATION_NAME" and node.node_type in {"CONCOURSE", "ENTRANCE"}:
            score += 12 if node.node_type == "CONCOURSE" else 10
        if score:
            scored.append((score, node))
    scored.sort(key=lambda item: (-item[0], item[1].name))
    return scored


def _explain(station: Station, node: IndoorNode, interpretation: dict, confidence: str) -> str:
    if confidence == "HIGH":
        extra = f" towards {interpretation['direction_hint']}" if interpretation.get("direction_hint") else ""
        return f"MetroWay matched this sign to {station.station_name}, {node.name}{extra}. This uses verified indoor data, not an estimated guess."
    if confidence == "MEDIUM":
        return f"This likely matches {station.station_name}, {node.name}. If it does not look right, choose your location on the map."
    return f"{station.station_name} may be relevant, but MetroWay cannot confirm the exact indoor spot."


def match_text(db: Session, text: str, station_token: str | None = None, use_ai: bool = False) -> dict:
    names = station_names(db)
    interpretation = extract_with_ai(text, names) if use_ai else interpret_sign_text(text, names)
    return match_interpretation(db, interpretation, station_token)


def match_node(db: Session, node_id: str) -> dict:
    node = db.scalar(select(IndoorNode).options(selectinload(IndoorNode.level), selectinload(IndoorNode.station)).where(IndoorNode.id == node_id))
    if node is None or node.station is None:
        return empty_result(
            status="NO_MATCH",
            confidence="UNKNOWN",
            title="We’re not confident enough to determine your exact location.",
            explanation="That indoor location is not in MetroWay’s verified data.",
        )
    station = node.station
    interpretation = {"type": node.node_type, "raw_text": node.name, "observations": [node.name]}
    return {
        "status": "MATCH_FOUND",
        "confidence": "HIGH",
        "title": "We found a likely match",
        "summary": f"{station.station_name} — {node.name}",
        "explanation": f"Continue from {station.station_name}, {node.name}.",
        "recognized_text": node.name,
        "interpretation": interpretation,
        "station": _station_public(station),
        "station_id": station.alternate_name or station.station_code,
        "level_id": node.level_id,
        "node_id": node.id,
        "node": _node_public(node, station),
        "candidates": [],
        "clarification_options": [],
        "next_action": {"type": "CONTINUE_NAVIGATION", "instruction": f"Continue indoor navigation from {node.name}."},
        "can_continue": True,
    }


def station_context(db: Session, station_id: str) -> dict | None:
    station = find_station(db, station_id)
    if station is None:
        return None
    nodes = list(station.indoor_nodes)
    return {
        "station": _station_public(station),
        "levels": sorted({(n.level.level_code, n.level.level_name) for n in nodes if n.level}),
        "nodes": [_node_public(node, station) for node in nodes],
        "clarification_options": sorted({node.name for node in nodes if node.node_type in {"LIFT", "ESCALATOR", "TICKET_COUNTER", "PLATFORM", "GATE", "EXIT", "CONCOURSE"}}),
    }
