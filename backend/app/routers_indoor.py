from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.indoor_service import (
    get_indoor_map,
    list_indoor_edges,
    list_indoor_nodes,
    list_map_metadata,
    require_level,
    require_station,
)
from app.schemas import IndoorEdgeOut, IndoorMapOut, IndoorNodeOut, MapMetadataOut

router = APIRouter(prefix="/api")


def _station_or_404(db: Session, station_id: str):
    if not station_id.strip():
        raise HTTPException(status_code=400, detail="Invalid station id")
    station = require_station(db, station_id)
    if station is None:
        raise HTTPException(status_code=404, detail="Station not found")
    return station


@router.get("/stations/{station_id}/indoor-map", response_model=IndoorMapOut)
def read_indoor_map(station_id: str, db: Session = Depends(get_db)):
    station = _station_or_404(db, station_id)
    return get_indoor_map(db, station)


@router.get("/stations/{station_id}/indoor-map/{level_id}", response_model=IndoorMapOut)
def read_indoor_map_level(station_id: str, level_id: str, db: Session = Depends(get_db)):
    station = _station_or_404(db, station_id)
    if not level_id.strip():
        raise HTTPException(status_code=400, detail="Invalid level id")
    level = require_level(db, station, level_id)
    if level is None:
        raise HTTPException(status_code=404, detail="Level not found")
    return get_indoor_map(db, station, level)


@router.get("/stations/{station_id}/indoor-nodes", response_model=list[IndoorNodeOut])
def read_indoor_nodes(station_id: str, db: Session = Depends(get_db)):
    station = _station_or_404(db, station_id)
    return list_indoor_nodes(db, station)


@router.get("/stations/{station_id}/indoor-edges", response_model=list[IndoorEdgeOut])
def read_indoor_edges(station_id: str, db: Session = Depends(get_db)):
    station = _station_or_404(db, station_id)
    return list_indoor_edges(db, station)


@router.get("/stations/{station_id}/map-metadata", response_model=list[MapMetadataOut])
def read_map_metadata(station_id: str, db: Session = Depends(get_db)):
    station = _station_or_404(db, station_id)
    return list_map_metadata(db, station)
