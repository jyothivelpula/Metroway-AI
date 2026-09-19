from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.position_service import get_marker_by_code, list_station_markers, resolve_position
from app.schemas import PositionMarkerListOut, PositionResolveOut, PositionResolveRequest

router = APIRouter(prefix="/api")


@router.get("/stations/{station_id}/position-markers", response_model=PositionMarkerListOut)
def station_position_markers(station_id: str, db: Session = Depends(get_db)):
    payload = list_station_markers(db, station_id)
    if payload is None:
        raise HTTPException(status_code=404, detail={"reason": "INVALID_STATION", "message": "Station not found"})
    return payload


@router.get("/position-markers/{marker_code}")
def position_marker_detail(marker_code: str, db: Session = Depends(get_db)):
    marker = get_marker_by_code(db, marker_code)
    if marker is None or marker.status != "ACTIVE":
        raise HTTPException(status_code=404, detail={"reason": "POSITION_MARKER_NOT_FOUND", "message": "Position marker not found"})
    from app.position_service import _public_marker

    return _public_marker(marker)


@router.post("/position/resolve", response_model=PositionResolveOut)
def position_resolve(body: PositionResolveRequest, db: Session = Depends(get_db)):
    return resolve_position(db, marker_code=body.marker_code, payload=body.payload)
