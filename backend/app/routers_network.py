from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.network_service import (
    get_interchanges,
    get_line_network,
    get_network,
    get_station_neighborhood,
    get_terminals,
    require_line,
    require_station,
)
from app.schemas import (
    InterchangeListOut,
    NetworkLineDetailOut,
    NetworkOut,
    StationConnectionsOut,
    TerminalOut,
)

router = APIRouter(prefix="/api")


@router.get("/network", response_model=NetworkOut)
def read_network(db: Session = Depends(get_db)):
    return get_network(db)


@router.get("/network/interchanges", response_model=InterchangeListOut)
def read_interchanges(db: Session = Depends(get_db)):
    return get_interchanges(db)


@router.get("/network/terminals", response_model=list[TerminalOut])
def read_terminals(db: Session = Depends(get_db)):
    return get_terminals(db)


@router.get("/network/lines/{line_id}", response_model=NetworkLineDetailOut)
def read_line_network(line_id: str, db: Session = Depends(get_db)):
    if not line_id.strip():
        raise HTTPException(status_code=400, detail="Invalid line id")
    line = require_line(db, line_id)
    if line is None:
        raise HTTPException(status_code=404, detail="Line not found")
    return get_line_network(db, line)


@router.get("/stations/{station_id}/connections", response_model=StationConnectionsOut)
def read_station_connections(station_id: str, db: Session = Depends(get_db)):
    if not station_id.strip():
        raise HTTPException(status_code=400, detail="Invalid station id")
    station = require_station(db, station_id)
    if station is None:
        raise HTTPException(status_code=404, detail="Station not found")
    return get_station_neighborhood(db, station)
