from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Line, Station, StationLine, Verification
from app.seed import STATION_SLUGS


def get_lines(db: Session):
    return db.scalars(select(Line).order_by(Line.line_code)).all()


def _station_query(db: Session):
    return select(Station).options(selectinload(Station.line_links).selectinload(StationLine.line))


def find_station(db: Session, station_key: str) -> Station | None:
    key = station_key.strip()
    code = STATION_SLUGS.get(key.lower(), key.upper())
    stmt = _station_query(db).where(
        or_(
            Station.id == key,
            Station.station_code == code,
            Station.station_code == key.upper(),
            Station.alternate_name == key.lower(),
        )
    )
    return db.scalar(stmt)


def list_stations(db: Session, q: str | None = None, line: str | None = None) -> list[Station]:
    stmt = _station_query(db)
    if q:
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Station.station_name).like(like),
                func.lower(Station.station_code).like(like),
                func.lower(Station.alternate_name).like(like),
            )
        )
    stations = db.scalars(stmt.order_by(Station.station_name)).unique().all()
    if not line or line.lower() == "all":
        return list(stations)
    needle = line.strip().lower()
    filtered = []
    for station in stations:
        names = {link.line.display_name.lower() for link in station.line_links}
        names.update({link.line.line_code.lower() for link in station.line_links})
        names.update({link.line.line_name.lower() for link in station.line_links})
        if needle in names:
            filtered.append(station)
    return filtered


def station_is_interchange(station: Station) -> bool:
    return any(link.is_interchange for link in station.line_links) or len(station.line_links) > 1


def station_is_terminal(station: Station) -> bool:
    return any(link.is_terminal for link in station.line_links)


def station_line_names(station: Station) -> list[str]:
    return [link.line.display_name for link in sorted(station.line_links, key=lambda item: item.line.line_code)]


def get_verification(db: Session, entity_type: str, entity_id: str) -> Verification | None:
    return db.scalar(
        select(Verification).where(
            Verification.entity_type == entity_type,
            Verification.entity_id == entity_id,
        )
    )


def find_line(db: Session, line_key: str) -> Line | None:
    key = line_key.strip()
    return db.scalar(
        select(Line)
        .options(selectinload(Line.station_links).selectinload(StationLine.station))
        .where(
            or_(
                Line.id == key,
                Line.line_code == key.upper(),
                func.lower(Line.display_name) == key.lower(),
                func.lower(Line.line_name) == key.lower(),
            )
        )
    )
