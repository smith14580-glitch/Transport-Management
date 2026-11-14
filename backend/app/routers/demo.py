from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.errors import ApiError, ok
from app.db.session import get_db
from app.services.seed_service import seed_database

router = APIRouter(
    prefix="/api/v1/demo",
    tags=["demo"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/reset")
def reset_demo(db: Session = Depends(get_db)):
    if settings.is_production:
        raise ApiError(404, "NOT_FOUND", "Not found.")
    seed_database(db, reset=True)
    db.commit()
    return ok(None)
