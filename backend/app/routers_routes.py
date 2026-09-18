from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.indoor_route_service import plan_indoor_route
from app.pathfinding import RouteError
from app.schemas import IndoorRouteOut, IndoorRouteRequest

router = APIRouter(prefix="/api")


@router.post("/routes/indoor", response_model=IndoorRouteOut)
def create_indoor_route(payload: IndoorRouteRequest, db: Session = Depends(get_db)):
    try:
        return plan_indoor_route(
            db,
            station_id=payload.station_id,
            start_node_id=payload.start_node_id,
            destination_node_id=payload.destination_node_id,
            accessible_only=payload.accessible_only,
            current_node_id=payload.current_node_id,
        )
    except RouteError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"reason": exc.reason, "message": exc.message},
        ) from exc
