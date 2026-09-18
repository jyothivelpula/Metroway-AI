from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    AccessibilityOut,
    BusConnectionOut,
    FacilityOut,
    GateOut,
    IndoorComponentOut,
    LevelOut,
    LineOut,
    NearbyDestinationOut,
    PlatformOut,
    StationDetailOut,
    StationLineOut,
    StationSummaryOut,
    VerificationOut,
)
from app.services import (
    find_station,
    get_lines,
    get_verification,
    list_stations,
    station_is_interchange,
    station_is_terminal,
    station_line_names,
)

router = APIRouter(prefix="/api")


def _require_station(db: Session, station_id: str):
    station = find_station(db, station_id)
    if station is None:
        raise HTTPException(status_code=404, detail="Station not found")
    return station


def _summary(station) -> StationSummaryOut:
    return StationSummaryOut(
        id=station.id,
        station_code=station.station_code,
        station_name=station.station_name,
        telugu_name=station.telugu_name,
        alternate_name=station.alternate_name,
        station_status=station.station_status,
        city=station.city,
        state=station.state,
        verification_status=station.verification_status,
        is_interchange=station_is_interchange(station),
        is_terminal=station_is_terminal(station),
        lines=station_line_names(station),
    )


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/lines", response_model=list[LineOut])
def read_lines(db: Session = Depends(get_db)):
    return get_lines(db)


@router.get("/stations", response_model=list[StationSummaryOut])
def read_stations(
    q: str | None = Query(default=None),
    line: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return [_summary(station) for station in list_stations(db, q=q, line=line)]


@router.get("/stations/search", response_model=list[StationSummaryOut])
def search_stations(q: str = Query(min_length=1), db: Session = Depends(get_db)):
    return [_summary(station) for station in list_stations(db, q=q)]


@router.get("/stations/{station_id}", response_model=StationDetailOut)
def read_station(station_id: str, db: Session = Depends(get_db)):
    station = _require_station(db, station_id)
    return StationDetailOut(
        **_summary(station).model_dump(),
        opening_date=station.opening_date,
        address=station.address,
        pincode=station.pincode,
        latitude=station.latitude,
        longitude=station.longitude,
        coordinate_source=station.coordinate_source,
        address_source=station.address_source,
        last_verified_date=station.last_verified_date,
        line_links=[
            StationLineOut(
                line_id=link.line_id,
                line_code=link.line.line_code,
                line_name=link.line.line_name,
                display_name=link.line.display_name,
                sequence_number=link.sequence_number,
                is_interchange=link.is_interchange,
                is_terminal=link.is_terminal,
            )
            for link in station.line_links
        ],
    )


@router.get("/stations/{station_id}/platforms", response_model=list[PlatformOut])
def read_platforms(station_id: str, db: Session = Depends(get_db)):
    station = _require_station(db, station_id)
    return station.platforms


@router.get("/stations/{station_id}/gates", response_model=list[GateOut])
def read_gates(station_id: str, db: Session = Depends(get_db)):
    station = _require_station(db, station_id)
    return station.gates


@router.get("/stations/{station_id}/levels", response_model=list[LevelOut])
def read_levels(station_id: str, db: Session = Depends(get_db)):
    station = _require_station(db, station_id)
    return sorted(station.levels, key=lambda item: item.level_order)


@router.get("/stations/{station_id}/facilities", response_model=list[FacilityOut])
def read_facilities(station_id: str, db: Session = Depends(get_db)):
    station = _require_station(db, station_id)
    return station.facilities


@router.get("/stations/{station_id}/accessibility", response_model=list[AccessibilityOut])
def read_accessibility(station_id: str, db: Session = Depends(get_db)):
    station = _require_station(db, station_id)
    return station.accessibility


@router.get("/stations/{station_id}/bus-connections", response_model=list[BusConnectionOut])
def read_bus_connections(station_id: str, db: Session = Depends(get_db)):
    station = _require_station(db, station_id)
    return station.bus_connections


@router.get("/stations/{station_id}/nearby-destinations", response_model=list[NearbyDestinationOut])
def read_nearby(station_id: str, db: Session = Depends(get_db)):
    station = _require_station(db, station_id)
    return station.nearby_destinations


@router.get("/stations/{station_id}/indoor-components", response_model=list[IndoorComponentOut])
def read_indoor(station_id: str, db: Session = Depends(get_db)):
    station = _require_station(db, station_id)
    return station.indoor_components


@router.get("/stations/{station_id}/verification", response_model=VerificationOut | None)
def read_verification(station_id: str, db: Session = Depends(get_db)):
    station = _require_station(db, station_id)
    return get_verification(db, "station", station.id)
