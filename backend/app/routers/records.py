import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.errors import ApiError, ok
from app.db.session import get_db
from app.models import Booking, Payment, SaleRecord
from app.schemas.bookings import BookingOut
from app.schemas.records import SaleRecordCreate, SaleRecordOut
from app.services.common import TZ, money

router = APIRouter(
    prefix="/api/v1/records",
    tags=["records"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/rent")
def rent_records(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Booking).order_by(Booking.pickup_datetime.desc())
    ).scalars().all()
    return ok([BookingOut.model_validate(row).model_dump(mode="json") for row in rows])


@router.get("/sales")
def sale_records(db: Session = Depends(get_db)):
    rows = db.execute(
        select(SaleRecord).order_by(SaleRecord.record_date.desc())
    ).scalars().all()
    return ok([SaleRecordOut.model_validate(row).model_dump(mode="json") for row in rows])


@router.post("/sales")
def create_sale_record(payload: SaleRecordCreate, db: Session = Depends(get_db)):
    price = money(payload.price)
    paid = money(payload.amount_paid)
    if paid > price:
        raise ApiError(
            400, "VALIDATION_ERROR", "amount_paid cannot exceed price."
        )
    balance = price - paid
    when = datetime.datetime.combine(
        payload.record_date, datetime.time.min, tzinfo=TZ
    )
    record = SaleRecord(
        type=payload.type,
        car_name=payload.car_name.strip(),
        car_details=payload.car_details or None,
        party_name=payload.party_name.strip(),
        party_phone=payload.party_phone or None,
        price=price,
        amount_paid=paid,
        balance_amount=balance,
        payment_method=payload.payment_method,
        record_date=when,
        status="completed" if balance == 0 else "pending",
        notes=payload.notes or None,
    )
    db.add(record)
    db.flush()

    if paid > 0:
        if payload.payment_method == "bank":
            cash_amount, bank_amount = money(0), paid
        elif payload.payment_method == "split":
            cash_amount = (paid / Decimal("2")).quantize(Decimal("0.01"))
            bank_amount = paid - cash_amount
        else:
            cash_amount, bank_amount = paid, money(0)
        db.add(
            Payment(
                booking_id=None,
                booking_code=None,
                sale_id=record.id,
                customer_name=record.party_name,
                amount=paid,
                cash_amount=cash_amount,
                bank_amount=bank_amount,
                method=payload.payment_method,
                payment_date=when,
                reference=None,
                notes=f"{'Sale' if payload.type == 'sale' else 'Purchase'} — {record.car_name}",
            )
        )

    db.commit()
    db.refresh(record)
    return ok(SaleRecordOut.model_validate(record).model_dump(mode="json"))
