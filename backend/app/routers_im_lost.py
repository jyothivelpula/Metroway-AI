from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.im_lost_assist import ai_available, assist_from_verified
from app.im_lost_interpret import interpret_sign_text
from app.im_lost_match import match_interpretation, match_node, match_text, station_context, station_names
from app.im_lost_ocr import ImageError, decode_image_payload, ocr_engines, run_ocr, validate_image

router = APIRouter(prefix="/api")


class DescribeBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    message: str = Field(min_length=1, max_length=2000)
    station_id: str | None = Field(default=None, validation_alias=AliasChoices("station_id", "stationId"))


class MatchBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    text: str | None = None
    station_id: str | None = Field(default=None, validation_alias=AliasChoices("station_id", "stationId"))
    node_id: str | None = Field(default=None, validation_alias=AliasChoices("node_id", "nodeId"))


class AssistBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    text: str | None = None
    message: str | None = None
    station_id: str | None = Field(default=None, validation_alias=AliasChoices("station_id", "stationId"))
    node_id: str | None = Field(default=None, validation_alias=AliasChoices("node_id", "nodeId"))


def _meta(result: dict, ocr: dict | None = None) -> dict:
    engines = ocr_engines()
    result["ai_available"] = ai_available()
    result["ocr_available"] = engines["any"]
    if ocr is not None:
        result["ocr"] = {
            "raw_text": ocr.get("raw_text") or "",
            "confidence": ocr.get("confidence") or 0,
            "detected_terms": ocr.get("detected_terms") or [],
            "engine": ocr.get("engine"),
        }
    return result


@router.post("/im-lost/ocr")
async def im_lost_ocr(
    file: UploadFile | None = File(default=None),
    image_base64: str | None = Form(default=None),
):
    try:
        if file is not None and file.filename:
            content = await file.read()
            kind = validate_image(content, file.content_type)
        elif image_base64:
            content, content_type = decode_image_payload(image_base64)
            kind = validate_image(content, content_type)
        else:
            raise ImageError("Attach a station-sign photo.")
        return run_ocr(content, kind)
    except ImageError as exc:
        raise HTTPException(status_code=400, detail={"reason": "INVALID_IMAGE", "message": exc.message}) from exc


@router.post("/im-lost/analyze")
async def im_lost_analyze(
    db: Session = Depends(get_db),
    file: UploadFile | None = File(default=None),
    image_base64: str | None = Form(default=None),
    station_id: str | None = Form(default=None),
):
    try:
        if file is not None and file.filename:
            content = await file.read()
            kind = validate_image(content, file.content_type)
        elif image_base64:
            content, content_type = decode_image_payload(image_base64)
            kind = validate_image(content, content_type)
        else:
            raise ImageError("Attach a station-sign photo.")
        ocr = run_ocr(content, kind)
        if ocr.get("error") and not ocr.get("raw_text"):
            result = match_text(db, "", station_id)
            result["status"] = "LOW_CONFIDENCE"
            result["confidence"] = "LOW"
            result["title"] = "Couldn’t read the sign clearly."
            result["explanation"] = ocr["error"]
            result["can_continue"] = False
            result["next_action"] = {
                "type": "NEEDS_MANUAL_LOCATION",
                "instruction": "Try taking the photo closer to the sign, or tell us what you see.",
            }
            return assist_from_verified(_meta(result, ocr))
        names = station_names(db)
        interpretation = interpret_sign_text(ocr.get("raw_text") or "", names)
        result = match_interpretation(db, interpretation, station_id)
        return assist_from_verified(_meta(result, ocr))
    except ImageError as exc:
        raise HTTPException(status_code=400, detail={"reason": "INVALID_IMAGE", "message": exc.message}) from exc


@router.post("/im-lost/describe")
def im_lost_describe(body: DescribeBody, db: Session = Depends(get_db)):
    result = match_text(db, body.message.strip(), body.station_id, use_ai=True)
    return assist_from_verified(result)


@router.post("/im-lost/match")
def im_lost_match(body: MatchBody, db: Session = Depends(get_db)):
    if body.node_id:
        return assist_from_verified(match_node(db, body.node_id))
    if not (body.text or "").strip():
        raise HTTPException(status_code=400, detail={"reason": "NO_INPUT", "message": "Describe what you see, or choose a location."})
    return assist_from_verified(match_text(db, body.text.strip(), body.station_id, use_ai=False))


@router.post("/im-lost/assist")
def im_lost_assist(body: AssistBody, db: Session = Depends(get_db)):
    if body.node_id:
        return assist_from_verified(match_node(db, body.node_id), body.message)
    text = (body.message or body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail={"reason": "NO_INPUT", "message": "Tell us what you see."})
    return assist_from_verified(match_text(db, text, body.station_id, use_ai=True), body.message)


@router.get("/im-lost/station-context/{station_id}")
def im_lost_station_context(station_id: str, db: Session = Depends(get_db)):
    payload = station_context(db, station_id)
    if payload is None:
        raise HTTPException(status_code=404, detail={"reason": "INVALID_STATION", "message": "Station not found"})
    return payload
