import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import Booking, Car
from app.services.common import money

ACTIVE_STATUSES = ("upcoming", "active")


def lock_car(db: Session, car_id: uuid.UUID) -> Car | None:
    return db.execute(
        select(Car).where(Car.id == car_id).with_for_update()
    ).scalar_one_or_none()


def find_overlap(
    db: Session,
    car_id: uuid.UUID,
    pickup: datetime,
    return_at: datetime,
    exclude_booking_id: uuid.UUID | None = None,
    lock: bool = False,
) -> Booking | None:
    stmt = select(Booking).where(
        Booking.car_id == car_id,
        Booking.status.in_(ACTIVE_STATUSES),
        Booking.pickup_datetime < return_at,
        Booking.return_datetime > pickup,
    )
    if exclude_booking_id is not None:
        stmt = stmt.where(Booking.id != exclude_booking_id)
    stmt = stmt.order_by(Booking.pickup_datetime)
    if lock:
        stmt = stmt.with_for_update()
    return db.execute(stmt).scalars().first()


def next_booking_code(db: Session, year: int) -> str:
    # Serialise code allocation per year inside the current transaction.
    db.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
        {"key": f"booking_code:{year}"},
    )
    prefix = f"HK-{year}-"
    last = db.execute(
        select(func.max(Booking.booking_code)).where(
            Booking.booking_code.like(f"{prefix}%")
        )
    ).scalar_one_or_none()
    sequence = 1
    if last:
        try:
            sequence = int(str(last).rsplit("-", 1)[-1]) + 1
        except (TypeError, ValueError):
            sequence = 1
    return f"{prefix}{sequence:04d}"


def recompute_booking_amounts(booking: Booking) -> None:
    total = money(booking.total_amount)
    paid = money(booking.amount_paid)
    balance = total - paid
    if balance < 0:
        balance = Decimal("0.00")
    booking.balance_amount = balance
    if balance == 0:
        booking.payment_status = "paid"
    elif paid > 0:
        booking.payment_status = "partial"
    else:
        booking.payment_status = "unpaid"


def advance_split(payment_plan: str, amount: float | Decimal) -> tuple[str, Decimal, Decimal]:
    value = money(amount)
    if payment_plan == "full_bank":
        return "bank", Decimal("0.00"), value
    if payment_plan == "half_cash_half_bank":
        cash = (value / 2).quantize(Decimal("0.01"))
        bank = value - cash
        return "split", cash, bank
    return "cash", value, Decimal("0.00")


def assert_no_overlap(
    db: Session,
    car_id: uuid.UUID,
    pickup: datetime,
    return_at: datetime,
    exclude_booking_id: uuid.UUID | None = None,
) -> None:
    clash = find_overlap(
        db,
        car_id,
        pickup,
        return_at,
        exclude_booking_id=exclude_booking_id,
        lock=True,
    )
    if clash:
        raise ApiError(
            409,
            "DOUBLE_BOOKING",
            f"This car is already booked for that time ({clash.booking_code}, "
            f"{clash.customer_name}).",
        )
