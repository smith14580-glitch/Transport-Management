import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.errors import ApiError, ok
from app.db.session import get_db
from app.models import Booking, Car
from app.schemas.cars import CarCreate, CarOut, CarUpdate
from app.services.common import money
from app.services.db_utils import conflict_from_integrity

router = APIRouter(
    prefix="/api/v1/cars",
    tags=["cars"],
    dependencies=[Depends(get_current_user)],
)

RATE_FIELDS = {
    "rate_with_driver_hour",
    "rate_with_driver_day",
    "rate_self_hour",
    "rate_self_day",
}
NULLABLE_FIELDS = RATE_FIELDS | {"notes"}


def _get_car(db: Session, car_id: uuid.UUID) -> Car:
    car = db.get(Car, car_id)
    if car is None:
        raise ApiError(404, "NOT_FOUND", "Car not found.")
    return car


@router.get("")
def list_cars(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Car).order_by(Car.created_at.asc(), Car.name.asc())
    ).scalars().all()
    return ok([CarOut.model_validate(row).model_dump(mode="json") for row in rows])


@router.get("/{car_id}")
def get_car(car_id: uuid.UUID, db: Session = Depends(get_db)):
    car = _get_car(db, car_id)
    return ok(CarOut.model_validate(car).model_dump(mode="json"))


@router.post("")
def create_car(payload: CarCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    for field in RATE_FIELDS:
        data[field] = money(data[field]) if data[field] is not None else None
    data["notes"] = data.get("notes") or None
    car = Car(**data)
    try:
        db.add(car)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise conflict_from_integrity(exc) from exc
    db.refresh(car)
    return ok(CarOut.model_validate(car).model_dump(mode="json"))


@router.patch("/{car_id}")
def update_car(
    car_id: uuid.UUID, payload: CarUpdate, db: Session = Depends(get_db)
):
    car = _get_car(db, car_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if value is None and field not in NULLABLE_FIELDS:
            continue
        if field in RATE_FIELDS:
            setattr(car, field, money(value) if value is not None else None)
        else:
            setattr(car, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise conflict_from_integrity(exc) from exc
    db.refresh(car)
    return ok(CarOut.model_validate(car).model_dump(mode="json"))


@router.delete("/{car_id}")
def delete_car(car_id: uuid.UUID, db: Session = Depends(get_db)):
    car = _get_car(db, car_id)
    active = db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.car_id == car.id,
            Booking.status.in_(("upcoming", "active")),
        )
    ) or 0
    if active:
        raise ApiError(
            400,
            "CAR_HAS_ACTIVE_BOOKINGS",
            "This car has active or upcoming bookings and cannot be deleted.",
        )
    db.delete(car)
    db.commit()
    return ok(None)
