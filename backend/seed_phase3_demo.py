from app.database import Base, SessionLocal, engine
from app.seed import seed_demo_data
from app.seed_network import ensure_network_columns


def main() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_network_columns()
    db = SessionLocal()
    try:
        seed_demo_data(db)
        print("Phase 3 demo network seeded.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
