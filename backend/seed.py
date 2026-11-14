import sys

from app.db.session import SessionLocal
from app.services.seed_service import seed_database


def main() -> None:
    reset = "--reset" in sys.argv[1:]
    with SessionLocal() as db:
        try:
            created = seed_database(db, reset=reset)
            db.commit()
        except Exception:
            db.rollback()
            raise
    if created:
        print("Seed complete — SAMPLE demo data only.")
    else:
        print("Data already present. Run `python seed.py --reset` to reseed.")


if __name__ == "__main__":
    main()
