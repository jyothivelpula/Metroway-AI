from __future__ import annotations

from app.config import settings


def ai_available() -> bool:
    return bool(settings.openai_api_key.strip())


def explain_match(result: dict) -> str:
    if result.get("explanation"):
        return result["explanation"]
    if result.get("next_action", {}).get("instruction"):
        return result["next_action"]["instruction"]
    return "Choose your location, or try another photo."


def assist_from_verified(result: dict, question: str | None = None) -> dict:
    result = dict(result)
    result["assistant"] = explain_match(result)
    if question and result.get("can_continue") is False and not result.get("clarification_options"):
        result["assistant"] = "I need a little more information. Which station are you in, or what else can you see?"
    result["ai_available"] = ai_available()
    return result
