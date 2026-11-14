import math
import uuid
from datetime import date, datetime, time

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.errors import ApiError, ok
from app.db.session import get_db
from app.models import Booking, Customer, Driver, Payment
from app.schemas.bookings import (
    AssignDriverRequest,
    BookingCreate,
    BookingOut,
    BookingStatus,
    BookingUpdate,
    CancelBookingRequest,
    PaymentStatus,
)
from app.services.booking_service import (
    advance_split,
    advance_split,
    assert_no_overlap,
    find_overlap,
    lock_car,
    next_booking_code,
    recompute_booking_amounts,
)
from app.services.common import TZ, date_only, money, normalize_phone, today_local, to_local
from app.services.settings_service import get_business_settings
from app.services.db_utils import conflict_from_integrity, parse_uuid

router = APIRouter(
    prefix="/api/v1",
    tags=["bookings"],
    dependencies=[Depends(get_current_user)],
)


def _get_booking(db: Session, identifier: str) -> Booking:
    uid = parse_uuid(identifier)
    booking = db.get(Booking, uid) if uid is not None else None
    if booking is None:
        booking = db.execute(
            select(Booking).where(Booking.booking_code == identifier)
        ).scalar_one_or_none()
    if booking is None:
        raise ApiError(404, "NOT_FOUND", "Booking not found.")
    return booking


def _normalised_phone_sql():
    expr = func.replace(Customer.phone, " ", "")
    expr = func.replace(expr, "-", "")
    expr = func.replace(expr, "(", "")
    expr = func.replace(expr, ")", "")
    return expr


@router.get("/bookings")
def list_bookings(
    search: str | None = Query(default=None),
    status: BookingStatus | None = Query(default=None),
    payment_status: PaymentStatus | None = Query(default=None),
    car_id: uuid.UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stmt = select(Booking)
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Booking.customer_name.ilike(like),
                Booking.customer_phone.ilike(like),
                Booking.car_name.ilike(like),
                Booking.booking_code.ilike(like),
            )
        )
    if status:
        stmt = stmt.where(Booking.status == status)
    if payment_status:
        stmt = stmt.where(Booking.payment_status == payment_status)
    if car_id:
        stmt = stmt.where(Booking.car_id == car_id)
    if date_from:
        stmt = stmt.where(
            Booking.pickup_datetime
            >= datetime.combine(date_from, time.min, tzinfo=TZ)
        )
    if date_to:
        stmt = stmt.where(
            Booking.pickup_datetime < datetime.combine(date_to, time.max, tzinfo=TZ)
        )
    stmt = stmt.order_by(Booking.pickup_datetime.asc())
    rows = db.execute(stmt).scalars().all()
    return ok([BookingOut.model_validate(row).model_dump(mode="json") for row in rows])


@router.get("/bookings/{identifier}")
def get_booking(identifier: str, db: Session = Depends(get_db)):
    booking = _get_booking(db, identifier)
    return ok(BookingOut.model_validate(booking).model_dump(mode="json"))


@router.post("/bookings")
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)):
    pickup = to_local(payload.pickup_datetime)
    return_at = to_local(payload.return_datetime)
    if return_at <= pickup:
        raise ApiError(400, "VALIDATION_ERROR", "return_datetime must be after pickup_datetime.")

    total = money(payload.total_amount)
    advance = money(payload.advance_amount)
    if advance > total:
        raise ApiError(400, "VALIDATION_ERROR", "advance_amount cannot exceed total_amount.")

    car = lock_car(db, payload.car_id)
    if car is None:
        raise ApiError(404, "NOT_FOUND", "Car not found.")

    driver = None
    if payload.driver_id is not None:
        driver = db.get(Driver, payload.driver_id)
        if driver is None:
            raise ApiError(404, "NOT_FOUND", "Driver not found.")
        if driver.status != "available":
            raise ApiError(400, "DRIVER_NOT_AVAILABLE", "Sirf available drivers assign ho sakte hain.")

    assert_no_overlap(db, car.id, pickup, return_at)

    customer = db.execute(
        select(Customer).where(
            _normalised_phone_sql() == normalize_phone(payload.customer_phone)
        )
    ).scalars().first()
    if customer is None:
        customer = Customer(
            full_name=payload.customer_name.strip(),
            phone=payload.customer_phone.strip(),
        )
        db.add(customer)
        db.flush()

    booking = Booking(
        booking_code=next_booking_code(db, pickup.year),
        customer_id=customer.id,
        customer_name=payload.customer_name.strip(),
        customer_phone=payload.customer_phone.strip(),
        car_id=car.id,
        car_name=car.name,
        driver_id=driver.id if driver else None,
        driver_name=driver.full_name if driver else None,
        late_penalty_amount=0,
        pickup_datetime=pickup,
        return_datetime=return_at,
        driver_option=payload.driver_option,
        duration_value=payload.duration_value,
        duration_unit=payload.duration_unit,
        rate_per_unit=money(payload.rate_per_unit),
        total_amount=total,
        advance_amount=advance,
        amount_paid=advance,
        balance_amount=total - advance,
        payment_plan=payload.payment_plan,
        status="active" if date_only(pickup) <= today_local() else "upcoming",
        notes=payload.notes or None,
    )
    recompute_booking_amounts(booking)

    try:
        db.add(booking)
        db.flush()
        if driver is not None:
            driver.status = "on_trip"
        if advance > 0:
            method, cash, bank = advance_split(payload.payment_plan, advance)
            db.add(
                Payment(
                    booking_id=booking.id,
                    booking_code=booking.booking_code,
                    sale_id=None,
                    customer_name=booking.customer_name,
                    amount=advance,
                    cash_amount=cash,
                    bank_amount=bank,
                    method=method,
                    payment_date=datetime.combine(today_local(), time.min, tzinfo=TZ),
                    reference=None,
                    notes="Advance on booking",
                )
            )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise conflict_from_integrity(exc) from exc

    db.refresh(booking)
    return ok(BookingOut.model_validate(booking).model_dump(mode="json"))


@router.patch("/bookings/{identifier}")
def update_booking(
    identifier: str, payload: BookingUpdate, db: Session = Depends(get_db)
):
    booking = _get_booking(db, identifier)
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return ok(BookingOut.model_validate(booking).model_dump(mode="json"))

    new_pickup = (
        to_local(data["pickup_datetime"])
        if data.get("pickup_datetime") is not None
        else booking.pickup_datetime
    )
    new_return = (
        to_local(data["return_datetime"])
        if data.get("return_datetime") is not None
        else booking.return_datetime
    )
    if new_return <= new_pickup:
        raise ApiError(400, "VALIDATION_ERROR", "return_datetime must be after pickup_datetime.")

    dates_changed = (
        new_pickup != booking.pickup_datetime or new_return != booking.return_datetime
    )
    if dates_changed and booking.car_id is not None:
        lock_car(db, booking.car_id)
        assert_no_overlap(
            db,
            booking.car_id,
            new_pickup,
            new_return,
            exclude_booking_id=booking.id,
        )

    booking.pickup_datetime = new_pickup
    booking.return_datetime = new_return
    for field in (
        "driver_option",
        "duration_value",
        "duration_unit",
        "rate_per_unit",
        "payment_plan",
        "notes",
    ):
        if field in data:
            setattr(booking, field, data[field])
    if "rate_per_unit" in data:
        booking.rate_per_unit = money(data["rate_per_unit"])
    if "total_amount" in data:
        booking.total_amount = money(data["total_amount"])
        recompute_booking_amounts(booking)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise conflict_from_integrity(exc) from exc

    db.refresh(booking)
    return ok(BookingOut.model_validate(booking).model_dump(mode="json"))


@router.post("/bookings/{identifier}/cancel")
def cancel_booking(
    identifier: str,
    payload: CancelBookingRequest | None = Body(default=None),
    db: Session = Depends(get_db),
):
    booking = _get_booking(db, identifier)
    if booking.status == "completed":
        raise ApiError(400, "CANNOT_CANCEL", "A completed booking cannot be cancelled.")
    if booking.status != "cancelled":
        if booking.driver_id is not None:
            drv = db.get(Driver, booking.driver_id)
            if drv is not None:
                drv.status = "available"
        booking.status = "cancelled"
        reason = (payload.reason if payload else None) or ""
        if reason.strip():
            existing = (booking.notes or "").strip()
            suffix = f"[Cancelled: {reason.strip()}]"
            booking.notes = f"{existing} {suffix}".strip()
        db.commit()
        db.refresh(booking)
    return ok(BookingOut.model_validate(booking).model_dump(mode="json"))


@router.post("/bookings/{identifier}/complete")
def complete_booking(identifier: str, db: Session = Depends(get_db)):
    booking = _get_booking(db, identifier)
    if booking.status == "cancelled":
        raise ApiError(400, "CANNOT_COMPLETE", "A cancelled booking cannot be completed.")
    if booking.status != "completed":
        if booking.driver_id is not None:
            drv = db.get(Driver, booking.driver_id)
            if drv is not None:
                drv.status = "available"

        settings = get_business_settings(db)
        now = datetime.now(TZ)
        ms_late = (now - booking.return_datetime).total_seconds() * 1000
        if settings.late_penalty_enabled and ms_late > 0:
            hours_late = math.ceil(ms_late / 3600000)
            penalty = hours_late * (settings.late_return_penalty_per_hour or 0)
            booking.late_penalty_amount = money(penalty)
            booking.balance_amount = money(booking.balance_amount) + money(penalty)
            recompute_booking_amounts(booking)
            note = f"Late penalty: PKR {penalty} ({hours_late} hours late)"
            booking.notes = f"{booking.notes} · {note}".strip(" ·") if booking.notes else note

        booking.status = "completed"
        db.commit()
        db.refresh(booking)
    return ok(BookingOut.model_validate(booking).model_dump(mode="json"))


@router.post("/bookings/{booking_id}/assign-driver")
def assign_driver(
    booking_id: uuid.UUID,
    payload: AssignDriverRequest,
    db: Session = Depends(get_db),
):
    booking = db.execute(
        select(Booking).where(Booking.id == booking_id).with_for_update()
    ).scalar_one_or_none()
    if booking is None:
        raise ApiError(404, "NOT_FOUND", "Booking not found.")

    if booking.driver_id is not None and booking.driver_id != payload.driver_id:
        old = db.get(Driver, booking.driver_id)
        if old is not None:
            old.status = "available"

    if payload.driver_id is None:
        booking.driver_id = None
        booking.driver_name = None
        booking.driver_option = "self_drive"
    else:
        driver = db.get(Driver, payload.driver_id)
        if driver is None:
            raise ApiError(404, "NOT_FOUND", "Driver not found.")
        if driver.status != "available" and driver.id != booking.driver_id:
            raise ApiError(400, "DRIVER_NOT_AVAILABLE", "Sirf available drivers assign ho sakte hain.")
        driver.status = "on_trip"
        booking.driver_id = driver.id
        booking.driver_name = driver.full_name
        booking.driver_option = "with_driver"

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise conflict_from_integrity(exc) from exc
    db.refresh(booking)
    return ok(BookingOut.model_validate(booking).model_dump(mode="json"))


@router.get("/availability/check")
def check_availability(
    car_id: uuid.UUID,
    pickup_datetime: datetime,
    return_datetime: datetime,
    exclude_booking_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
):
    pickup = to_local(pickup_datetime)
    return_at = to_local(return_datetime)
    if return_at <= pickup:
        raise ApiError(400, "VALIDATION_ERROR", "return_datetime must be after pickup_datetime.")
    clash = find_overlap(
        db,
        car_id,
        pickup,
        return_at,
        exclude_booking_id=exclude_booking_id,
    )
    return ok(
        {
            "available": clash is None,
            "conflicting_booking_code": clash.booking_code if clash else None,
        }
    )
