from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models import Booking, Payment
from app.services.booking_service import recompute_booking_amounts
from app.services.common import TZ, money


def resolve_split(
    method: str,
    amount: float,
    cash_amount: float | None,
    bank_amount: float | None,
) -> tuple[Decimal, Decimal]:
    total = money(amount)
    if method == "cash":
        return total, Decimal("0.00")
    if method == "bank":
        return Decimal("0.00"), total
    if method == "split":
        if cash_amount is None or bank_amount is None:
            raise ApiError(
                400,
                "INVALID_SPLIT",
                "A split payment requires cash_amount and bank_amount.",
            )
        cash = money(cash_amount)
        bank = money(bank_amount)
        if cash < 0 or bank < 0 or cash + bank != total:
            raise ApiError(
                400,
                "INVALID_SPLIT",
                "cash_amount + bank_amount must equal amount.",
            )
        return cash, bank
    raise ApiError(400, "VALIDATION_ERROR", "Invalid payment method.")


def create_booking_payment(
    db: Session,
    booking: Booking,
    amount: float,
    method: str,
    cash_amount: float | None,
    bank_amount: float | None,
    payment_date: date | datetime,
    reference: str | None = None,
    notes: str | None = None,
) -> Payment:
    if booking.status == "cancelled":
        raise ApiError(400, "BOOKING_CANCELLED", "Cannot record a payment on a cancelled booking.")

    value = money(amount)
    balance = money(booking.balance_amount)
    if value <= 0:
        raise ApiError(400, "VALIDATION_ERROR", "Payment amount must be greater than zero.")
    if value > balance:
        raise ApiError(
            400,
            "OVERPAYMENT",
            f"Amount PKR {value:,.2f} exceeds the remaining balance of PKR {balance:,.2f}.",
        )

    cash, bank = resolve_split(method, amount, cash_amount, bank_amount)

    if isinstance(payment_date, datetime):
        when = payment_date.astimezone(TZ) if payment_date.tzinfo else payment_date.replace(tzinfo=TZ)
    else:
        when = datetime.combine(payment_date, datetime.min.time(), tzinfo=TZ)

    payment = Payment(
        booking_id=booking.id,
        booking_code=booking.booking_code,
        sale_id=None,
        customer_name=booking.customer_name,
        amount=value,
        cash_amount=cash,
        bank_amount=bank,
        method=method,
        payment_date=when,
        reference=reference or None,
        notes=notes or None,
    )
    db.add(payment)

    booking.amount_paid = money(booking.amount_paid) + value
    recompute_booking_amounts(booking)
    db.flush()
    return payment
