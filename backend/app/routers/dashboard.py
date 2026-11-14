from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.errors import ok
from app.db.session import get_db
from app.models import Booking, Car, Payment
from app.schemas.dashboard import DashboardSummaryOut
from app.services.common import end_of_day, start_of_day, today_local

router = APIRouter(
    prefix="/api/v1/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    today = today_local()
    day_start = start_of_day(today)
    day_end = end_of_day(today)
    week_end = end_of_day(today + timedelta(days=7))

    cars_out_today = db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.status == "active",
            Booking.pickup_datetime < day_end,
            Booking.return_datetime >= day_start,
        )
    ) or 0
    todays_bookings = db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.pickup_datetime >= day_start,
            Booking.pickup_datetime < day_end,
            Booking.status != "cancelled",
        )
    ) or 0
    revenue = db.scalar(select(func.coalesce(func.sum(Payment.amount), 0))) or 0
    pending = db.scalar(
        select(func.coalesce(func.sum(Booking.balance_amount), 0)).where(
            Booking.status != "cancelled"
        )
    ) or 0
    fleet_available = db.scalar(
        select(func.count()).select_from(Car).where(Car.status == "available")
    ) or 0
    fleet_total = db.scalar(select(func.count()).select_from(Car)) or 0
    upcoming = db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.status == "upcoming",
            Booking.pickup_datetime < week_end,
        )
    ) or 0

    summary = DashboardSummaryOut(
        cars_out_today=int(cars_out_today),
        todays_bookings=int(todays_bookings),
        revenue_collected=float(revenue),
        pending_payments=float(pending),
        fleet_available=int(fleet_available),
        fleet_total=int(fleet_total),
        upcoming_bookings_count=int(upcoming),
    )
    return ok(summary.model_dump(mode="json"))
