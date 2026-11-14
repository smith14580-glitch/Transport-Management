import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint("return_datetime > pickup_datetime", name="bookings_dates_check"),
        CheckConstraint(
            "status IN ('upcoming','active','completed','cancelled')",
            name="bookings_status_check",
        ),
        CheckConstraint(
            "payment_status IN ('unpaid','partial','paid')",
            name="bookings_payment_status_check",
        ),
        CheckConstraint(
            "driver_option IN ('with_driver','self_drive')",
            name="bookings_driver_option_check",
        ),
        CheckConstraint(
            "duration_unit IN ('hours','days')",
            name="bookings_duration_unit_check",
        ),
        CheckConstraint(
            "payment_plan IN ('full_cash','full_bank','half_cash_half_bank','half_now_half_later')",
            name="bookings_payment_plan_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    booking_code: Mapped[str] = mapped_column(
        String(40), nullable=False, unique=True, index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    customer_name: Mapped[str] = mapped_column(String(160), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(40), nullable=False)
    car_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cars.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    car_name: Mapped[str] = mapped_column(String(160), nullable=False)
    driver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("drivers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    driver_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    late_penalty_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=0
    )
    pickup_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    return_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    driver_option: Mapped[str] = mapped_column(String(30), nullable=False)
    duration_value: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    duration_unit: Mapped[str] = mapped_column(String(20), nullable=False, default="days")
    rate_per_unit: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    advance_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    balance_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    payment_plan: Mapped[str] = mapped_column(String(40), nullable=False)
    payment_status: Mapped[str] = mapped_column(String(20), nullable=False, default="unpaid")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="upcoming", index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
