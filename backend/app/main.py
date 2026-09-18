from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Station
from app.routers import router
from app.routers_network import router as network_router
from app.routers_indoor import router as indoor_router
from app.routers_routes import router as routes_router
from app.seed import seed_demo_data
from app.seed_network import ensure_network_columns


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_network_columns()
    db = SessionLocal()
    try:
        count = db.scalar(select(func.count()).select_from(Station)) or 0
        if count == 0:
            seed_demo_data(db)
    finally:
        db.close()
    yield


app = FastAPI(title="MetroWay AI API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(network_router)
app.include_router(indoor_router)
app.include_router(routes_router)


@app.exception_handler(SQLAlchemyError)
def database_error(_request, _exc):
    return JSONResponse(status_code=500, content={"detail": "A database error occurred"})
