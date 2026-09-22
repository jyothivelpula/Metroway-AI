from __future__ import annotations

import json
import re

from app.config import settings

SIGN_TYPES = (
    "STATION_NAME",
    "PLATFORM",
    "LINE",
    "DIRECTION",
    "GATE",
    "EXIT",
    "CONCOURSE",
    "FACILITY",
    "TICKET_COUNTER",
    "LIFT",
    "ESCALATOR",
    "STAIRS",
    "BUS_STOP",
    "UNKNOWN",
)

FEATURE_MAP = {
    "lift": "LIFT",
    "elevator": "LIFT",
    "escalator": "ESCALATOR",
    "stairs": "STAIRS",
    "ticket": "TICKET_COUNTER",
    "counter": "TICKET_COUNTER",
    "concourse": "CONCOURSE",
    "exit": "EXIT",
    "entrance": "STATION_NAME",
    "gate": "GATE",
    "washroom": "FACILITY",
    "toilet": "FACILITY",
    "bus": "BUS_STOP",
    "platform": "PLATFORM",
}


def _norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()


def interpret_sign_text(text: str, station_names: list[str]) -> dict:
    blob = text or ""
    lower = blob.lower()
    compact = _norm(blob)
    station_hint = None
    direction_hint = None
    destination_hint = None
    platform = None
    platform_at = None
    pmatch = re.search(r"platform\s*([0-9]{1,2})", lower)
    if pmatch:
        platform = pmatch.group(1).zfill(2)
        platform_at = pmatch.start()
    for name in sorted({n for n in station_names if n}, key=len, reverse=True):
        key = _norm(name)
        if len(key) < 3 or key not in compact:
            continue
        toward = re.search(
            rf"(?:towards?|toward|to|for|direction|signs?\s+for)\s+{re.escape(name)}",
            blob,
            re.I,
        )
        name_at = lower.find(name.lower())
        after_platform = platform_at is not None and name_at > platform_at
        if toward or after_platform:
            direction_hint = direction_hint or name
            destination_hint = destination_hint or name
        elif not station_hint:
            station_hint = name

    gate = None
    gmatch = re.search(r"gate\s*([0-9a-z])", lower)
    if gmatch:
        gate = gmatch.group(1).upper()

    sign_type = "UNKNOWN"
    if platform:
        sign_type = "PLATFORM"
    elif "exit" in lower:
        sign_type = "EXIT"
    elif "gate" in lower:
        sign_type = "GATE"
    elif "ticket" in lower:
        sign_type = "TICKET_COUNTER"
    elif "lift" in lower or "elevator" in lower:
        sign_type = "LIFT"
    elif "escalator" in lower:
        sign_type = "ESCALATOR"
    elif "stairs" in lower:
        sign_type = "STAIRS"
    elif "concourse" in lower:
        sign_type = "CONCOURSE"
    elif "bus" in lower:
        sign_type = "BUS_STOP"
    elif station_hint and not direction_hint:
        sign_type = "STATION_NAME"
    elif direction_hint:
        sign_type = "DIRECTION"

    observations = []
    if platform:
        observations.append(f"Platform {platform.lstrip('0') or platform}")
    if gate:
        observations.append(f"Gate {gate}")
    for word, label in FEATURE_MAP.items():
        if word in lower and label not in {"STATION_NAME"} and label not in observations:
            observations.append(label.replace("_", " ").title() if label != "TICKET_COUNTER" else "Ticket counter")

    return {
        "type": sign_type,
        "station_hint": station_hint,
        "platform_hint": f"P{platform}" if platform else None,
        "direction_hint": direction_hint,
        "gate_hint": gate,
        "destination_hint": destination_hint,
        "observations": observations,
        "raw_text": blob,
    }


def extract_with_ai(text: str, station_names: list[str]) -> dict:
    parsed = interpret_sign_text(text, station_names)
    if not settings.openai_api_key.strip():
        return parsed
    try:
        import httpx

        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"},
            json={
                "model": settings.openai_model,
                "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "Extract Hyderabad Metro observations from the passenger. "
                            "Never invent gates, platforms, or stations that are not in the message. "
                            "JSON keys: station_hint, platform_hint, direction_hint, observations (array of strings)."
                        ),
                    },
                    {"role": "user", "content": json.dumps({"message": text, "known_stations": station_names[:80]})},
                ],
            },
            timeout=30.0,
        )
        if response.status_code >= 400:
            return parsed
        data = json.loads((((response.json() or {}).get("choices") or [{}])[0].get("message") or {}).get("content") or "{}")
        if data.get("station_hint") in station_names:
            parsed["station_hint"] = parsed["station_hint"] or data["station_hint"]
        if data.get("direction_hint") in station_names:
            parsed["direction_hint"] = parsed["direction_hint"] or data["direction_hint"]
        for item in data.get("observations") or []:
            if item and item not in parsed["observations"]:
                parsed["observations"].append(str(item))
        return parsed
    except Exception:
        return parsed
