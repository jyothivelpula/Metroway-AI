from app.database import SessionLocal, Base, engine
from app.seed import seed_demo_data


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_data(db)
        print("Demo data seeded.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
