from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings, sqlalchemy_url

engine = create_engine(
    sqlalchemy_url(settings.database_url),
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    future=True,
    connect_args={"prepare_threshold": None},
)


@event.listens_for(engine, "connect")
def _set_session_timezone(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
    with dbapi_connection.cursor() as cursor:
        cursor.execute(
            "SELECT set_config('TimeZone', %s, false)", (settings.app_timezone,)
        )


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
