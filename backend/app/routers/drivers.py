import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.errors import ApiError, ok
from app.db.session import get_db
from app.models import Booking, Driver
from app.schemas.bookings import BookingOut
from app.schemas.drivers import DriverCreate, DriverOut, DriverUpdate
from app.services.db_utils import conflict_from_integrity

router = APIRouter(
    prefix="/api/v1/drivers",
    tags=["drivers"],
    dependencies=[Depends(get_current_user)],
)


def _get_driver(db: Session, driver_id: uuid.UUID) -> Driver:
    driver = db.get(Driver, driver_id)
    if driver is None:
        raise ApiError(404, "NOT_FOUND", "Driver not found.")
    return driver


@router.get("")
def list_drivers(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Driver).order_by(Driver.created_at.asc(), Driver.full_name.asc())
    ).scalars().all()
    return ok([DriverOut.model_validate(row).model_dump(mode="json") for row in rows])


@router.get("/{driver_id}")
def get_driver(driver_id: uuid.UUID, db: Session = Depends(get_db)):
    driver = _get_driver(db, driver_id)
    return ok(DriverOut.model_validate(driver).model_dump(mode="json"))


@router.post("")
def create_driver(payload: DriverCreate, db: Session = Depends(get_db)):
    driver = Driver(
        full_name=payload.full_name.strip(),
        age=payload.age,
        date_of_birth=payload.date_of_birth,
        cnic=payload.cnic.strip(),
        phone=payload.phone.strip(),
        licence_no=payload.licence_no.strip(),
        licence_expiry=payload.licence_expiry,
        address=payload.address,
        emergency_contact=payload.emergency_contact,
        status=payload.status,
        notes=payload.notes,
        photo=payload.photo,
    )
    try:
        db.add(driver)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise conflict_from_integrity(exc) from exc
    db.refresh(driver)
    return ok(DriverOut.model_validate(driver).model_dump(mode="json"))


@router.patch("/{driver_id}")
def update_driver(
    driver_id: uuid.UUID, payload: DriverUpdate, db: Session = Depends(get_db)
):
    driver = _get_driver(db, driver_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(driver, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise conflict_from_integrity(exc) from exc
    db.refresh(driver)
    return ok(DriverOut.model_validate(driver).model_dump(mode="json"))


@router.delete("/{driver_id}")
def delete_driver(driver_id: uuid.UUID, db: Session = Depends(get_db)):
    driver = _get_driver(db, driver_id)
    active = db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(Booking.driver_id == driver.id, Booking.status.in_(("upcoming", "active")))
    ) or 0
    if driver.status == "on_trip" or active:
        raise ApiError(
            400,
            "DRIVER_ON_TRIP",
            "Driver is currently on a trip and cannot be deleted.",
        )
    db.delete(driver)
    db.commit()
    return ok(None)


@router.get("/{driver_id}/trips")
def driver_trips(driver_id: uuid.UUID, db: Session = Depends(get_db)):
    _get_driver(db, driver_id)
    rows = db.execute(
        select(Booking)
        .where(Booking.driver_id == driver_id)
        .order_by(Booking.pickup_datetime.desc())
    ).scalars().all()
    return ok([BookingOut.model_validate(row).model_dump(mode="json") for row in rows])
