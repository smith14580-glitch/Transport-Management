from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.errors import ok
from app.db.session import get_db
from app.schemas.settings import BusinessSettingsUpdate
from app.services.settings_service import (
    get_business_settings,
    update_business_settings,
)

router = APIRouter(
    prefix="/api/v1/settings",
    tags=["settings"],
    dependencies=[Depends(get_current_user)],
)


@router.get("")
def read_settings(db: Session = Depends(get_db)):
    return ok(get_business_settings(db).model_dump(mode="json"))


@router.patch("")
def patch_settings(payload: BusinessSettingsUpdate, db: Session = Depends(get_db)):
    settings = update_business_settings(db, payload)
    db.commit()
    return ok(settings.model_dump(mode="json"))
