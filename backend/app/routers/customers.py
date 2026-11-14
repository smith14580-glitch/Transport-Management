from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.errors import ok
from app.db.session import get_db
from app.models import Booking, Customer
from app.schemas.customers import CustomerOut, CustomerSummaryOut

router = APIRouter(
    prefix="/api/v1/customers",
    tags=["customers"],
    dependencies=[Depends(get_current_user)],
)


@router.get("")
def list_customers(
    search: str | None = Query(default=None), db: Session = Depends(get_db)
):
    stmt = select(Customer).order_by(Customer.full_name.asc())
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(Customer.full_name.ilike(like), Customer.phone.ilike(like))
        )
    rows = db.execute(stmt).scalars().all()
    return ok([CustomerOut.model_validate(row).model_dump(mode="json") for row in rows])


@router.get("/summaries")
def customer_summaries(db: Session = Depends(get_db)):
    total_bookings = func.count(Booking.id)
    total_rent = func.coalesce(func.sum(Booking.total_amount), 0)
    total_paid = func.coalesce(func.sum(Booking.amount_paid), 0)
    total_pending = func.coalesce(
        func.sum(
            case((Booking.status != "cancelled", Booking.balance_amount), else_=0)
        ),
        0,
    )
    rows = db.execute(
        select(
            Customer.id,
            Customer.full_name,
            Customer.phone,
            total_bookings,
            total_rent,
            total_paid,
            total_pending,
        )
        .outerjoin(Booking, Booking.customer_id == Customer.id)
        .group_by(Customer.id, Customer.full_name, Customer.phone)
        .order_by(total_rent.desc(), Customer.full_name.asc())
    ).all()

    summaries = [
        CustomerSummaryOut(
            customer_id=row[0],
            full_name=row[1],
            phone=row[2],
            total_bookings=int(row[3] or 0),
            total_rent_amount=float(row[4] or 0),
            total_paid=float(row[5] or 0),
            total_pending=float(row[6] or 0),
        ).model_dump(mode="json")
        for row in rows
    ]
    return ok(summaries)
