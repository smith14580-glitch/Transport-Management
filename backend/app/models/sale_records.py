import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SaleRecord(Base):
    __tablename__ = "sale_records"
    __table_args__ = (
        CheckConstraint("type IN ('sale','purchase')", name="sale_records_type_check"),
        CheckConstraint(
            "status IN ('completed','pending')", name="sale_records_status_check"
        ),
        CheckConstraint(
            "payment_method IN ('cash','bank','split')",
            name="sale_records_method_check",
        ),
        CheckConstraint("price >= 0", name="sale_records_price_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    car_name: Mapped[str] = mapped_column(String(160), nullable=False)
    car_details: Mapped[str | None] = mapped_column(String(500), nullable=True)
    party_name: Mapped[str] = mapped_column(String(160), nullable=False)
    party_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    balance_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False)
    record_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
