import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.errors import ApiError, ok
from app.db.session import get_db
from app.models import Booking, Payment
from app.schemas.payments import PaymentCreate, PaymentOut
from app.services.payment_service import create_booking_payment

router = APIRouter(
    prefix="/api/v1",
    tags=["payments"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/payments")
def list_payments(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Payment).order_by(
            Payment.payment_date.desc(), Payment.created_at.desc()
        )
    ).scalars().all()
    return ok([PaymentOut.model_validate(row).model_dump(mode="json") for row in rows])


@router.get("/payments/outstanding")
def outstanding_payments(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Booking)
        .where(Booking.balance_amount > 0, Booking.status != "cancelled")
        .order_by(Booking.pickup_datetime.asc())
    ).scalars().all()
    from app.schemas.bookings import BookingOut

    return ok([BookingOut.model_validate(row).model_dump(mode="json") for row in rows])


@router.get("/bookings/{booking_id}/payments")
def list_booking_payments(booking_id: uuid.UUID, db: Session = Depends(get_db)):
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise ApiError(404, "NOT_FOUND", "Booking not found.")
    rows = db.execute(
        select(Payment)
        .where(Payment.booking_id == booking.id)
        .order_by(Payment.payment_date.asc(), Payment.created_at.asc())
    ).scalars().all()
    return ok([PaymentOut.model_validate(row).model_dump(mode="json") for row in rows])


@router.post("/bookings/{booking_id}/payments")
def add_booking_payment(
    booking_id: uuid.UUID,
    payload: PaymentCreate,
    db: Session = Depends(get_db),
):
    booking = db.execute(
        select(Booking).where(Booking.id == booking_id).with_for_update()
    ).scalar_one_or_none()
    if booking is None:
        raise ApiError(404, "NOT_FOUND", "Booking not found.")

    payment = create_booking_payment(
        db,
        booking,
        amount=payload.amount,
        method=payload.method,
        cash_amount=payload.cash_amount,
        bank_amount=payload.bank_amount,
        payment_date=payload.payment_date,
        reference=payload.reference,
        notes=payload.notes,
    )
    db.commit()
    db.refresh(payment)
    return ok(PaymentOut.model_validate(payment).model_dump(mode="json"))
