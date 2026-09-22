from __future__ import annotations

import base64
import binascii
import re

from app.config import settings

ALLOWED = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/webp": (b"RIFF",),
}


class ImageError(ValueError):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _kind(content_type: str | None) -> str:
    kind = (content_type or "").split(";")[0].strip().lower()
    return "image/jpeg" if kind in {"image/jpg", "image/jpeg"} else kind


def validate_image(content: bytes, content_type: str | None) -> str:
    if not content:
        raise ImageError("Please upload a photo of the station sign.")
    if len(content) > settings.im_lost_max_image_bytes:
        raise ImageError("That photo is too large. Use an image under 5 MB.")
    kind = _kind(content_type)
    if kind not in ALLOWED:
        raise ImageError("Please upload a JPEG, PNG, or WebP photo.")
    if kind == "image/webp":
        if not (content.startswith(b"RIFF") and b"WEBP" in content[:16]):
            raise ImageError("That file does not look like a valid photo.")
    elif not content.startswith(ALLOWED[kind][0]):
        raise ImageError("That file does not look like a valid photo.")
    return kind


def decode_image_payload(value: str) -> tuple[bytes, str | None]:
    raw = (value or "").strip()
    if not raw:
        raise ImageError("Please upload a photo of the station sign.")
    if raw.startswith("data:"):
        header, _, encoded = raw.partition(",")
        content_type = header[5:].split(";")[0]
        try:
            return base64.b64decode(encoded, validate=True), content_type
        except (binascii.Error, ValueError) as exc:
            raise ImageError("That image could not be read.") from exc
    try:
        return base64.b64decode(raw, validate=True), None
    except (binascii.Error, ValueError) as exc:
        raise ImageError("That image could not be read.") from exc


def ocr_engines() -> dict:
    openai = bool(settings.openai_api_key.strip())
    tesseract = False
    try:
        import pytesseract  # noqa: F401

        tesseract = True
    except Exception:
        tesseract = False
    return {"openai": openai, "tesseract": tesseract, "any": openai or tesseract}


def run_ocr(content: bytes, content_type: str) -> dict:
    engines = ocr_engines()
    if engines["openai"]:
        result = _openai_ocr(content, content_type)
        if result["raw_text"] or result.get("error"):
            return result
    if engines["tesseract"]:
        return _tesseract_ocr(content)
    return {
        "raw_text": "",
        "confidence": 0.0,
        "detected_terms": [],
        "engine": None,
        "error": "Couldn’t read the sign clearly. Upload a clearer photo, or tell us what you see.",
    }


def _terms(text: str) -> list[str]:
    parts = [item.strip(" ,.;:-") for item in re.split(r"[\n|/]+", text) if item.strip()]
    if len(parts) <= 1:
        parts = [item for item in re.split(r"\s{2,}", text) if item.strip()]
    seen: list[str] = []
    for part in parts or [text]:
        cleaned = " ".join(part.split())
        if cleaned and cleaned not in seen:
            seen.append(cleaned)
    return seen[:12]


def _tesseract_ocr(content: bytes) -> dict:
    try:
        from io import BytesIO

        import pytesseract
        from PIL import Image

        text = " ".join((pytesseract.image_to_string(Image.open(BytesIO(content))) or "").split())
        if not text:
            return {
                "raw_text": "",
                "confidence": 0.2,
                "detected_terms": [],
                "engine": "tesseract",
                "error": "Couldn’t read the sign clearly. Try taking the photo closer to the sign.",
            }
        return {
            "raw_text": text,
            "confidence": 0.7,
            "detected_terms": _terms(text),
            "engine": "tesseract",
            "error": None,
        }
    except Exception:
        return {
            "raw_text": "",
            "confidence": 0.0,
            "detected_terms": [],
            "engine": "tesseract",
            "error": "Couldn’t read the sign clearly.",
        }


def _openai_ocr(content: bytes, content_type: str) -> dict:
    try:
        import httpx

        b64 = base64.b64encode(content).decode("ascii")
        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"},
            json={
                "model": settings.openai_model,
                "temperature": 0,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "Read Hyderabad Metro indoor signs. Return only visible wording. "
                            "Do not invent stations, gates, platforms, or distances. "
                            "If unreadable, return an empty string."
                        ),
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Transcribe the sign."},
                            {"type": "image_url", "image_url": {"url": f"data:{content_type};base64,{b64}"}},
                        ],
                    },
                ],
            },
            timeout=40.0,
        )
        if response.status_code >= 400:
            return {
                "raw_text": "",
                "confidence": 0.0,
                "detected_terms": [],
                "engine": "openai",
                "error": "Sign reading is temporarily unavailable. Tell us what you see, or choose your location.",
            }
        text = " ".join(str((((response.json() or {}).get("choices") or [{}])[0].get("message") or {}).get("content") or "").split())
        if not text:
            return {
                "raw_text": "",
                "confidence": 0.25,
                "detected_terms": [],
                "engine": "openai",
                "error": "Couldn’t read the sign clearly. Try taking the photo closer to the sign.",
            }
        return {
            "raw_text": text,
            "confidence": 0.9,
            "detected_terms": _terms(text),
            "engine": "openai",
            "error": None,
        }
    except Exception:
        return {
            "raw_text": "",
            "confidence": 0.0,
            "detected_terms": [],
            "engine": "openai",
            "error": "Sign reading is temporarily unavailable.",
        }
