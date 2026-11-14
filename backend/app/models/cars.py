import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Car(Base):
    __tablename__ = "cars"
    __table_args__ = (
        CheckConstraint(
            "status IN ('available','on_rent','maintenance','not_available')",
            name="cars_status_check",
        ),
        CheckConstraint(
            "category IN ('SUV','Sedan','Van','Hatchback')",
            name="cars_category_check",
        ),
        CheckConstraint(
            "transmission IN ('Automatic','Manual')",
            name="cars_transmission_check",
        ),
        CheckConstraint("fuel IN ('Petrol','Diesel')", name="cars_fuel_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False, default="SUV")
    seats: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    transmission: Mapped[str] = mapped_column(String(30), nullable=False, default="Automatic")
    fuel: Mapped[str] = mapped_column(String(30), nullable=False, default="Petrol")
    plate_no: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="available")
    rate_with_driver_hour: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    rate_with_driver_day: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    rate_self_hour: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    rate_self_day: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
