import datetime
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

BookingStatus = Literal["upcoming", "active", "completed", "cancelled"]
DriverOption = Literal["with_driver", "self_drive"]
DurationUnit = Literal["hours", "days"]
PaymentPlan = Literal[
    "full_cash", "full_bank", "half_cash_half_bank", "half_now_half_later"
]
PaymentStatus = Literal["unpaid", "partial", "paid"]


class BookingCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=160)
    customer_phone: str = Field(min_length=1, max_length=40)
    car_id: uuid.UUID
    pickup_datetime: datetime.datetime
    return_datetime: datetime.datetime
    driver_option: DriverOption
    duration_value: int = Field(ge=1)
    duration_unit: DurationUnit
    rate_per_unit: float = Field(ge=0)
    total_amount: float = Field(ge=0)
    advance_amount: float = Field(ge=0)
    payment_plan: PaymentPlan
    driver_id: uuid.UUID | None = None
    driver_name: str | None = None
    notes: str | None = None


class BookingUpdate(BaseModel):
    pickup_datetime: datetime.datetime | None = None
    return_datetime: datetime.datetime | None = None
    driver_option: DriverOption | None = None
    duration_value: int | None = Field(default=None, ge=1)
    duration_unit: DurationUnit | None = None
    rate_per_unit: float | None = Field(default=None, ge=0)
    total_amount: float | None = Field(default=None, ge=0)
    payment_plan: PaymentPlan | None = None
    notes: str | None = None


class CancelBookingRequest(BaseModel):
    reason: str | None = None


class AssignDriverRequest(BaseModel):
    driver_id: uuid.UUID | None = None


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_code: str
    customer_id: uuid.UUID
    customer_name: str
    customer_phone: str
    car_id: uuid.UUID | None
    car_name: str
    pickup_datetime: datetime.datetime
    return_datetime: datetime.datetime
    driver_option: DriverOption
    duration_value: int
    duration_unit: DurationUnit
    rate_per_unit: float
    total_amount: float
    advance_amount: float
    amount_paid: float
    balance_amount: float
    payment_plan: PaymentPlan
    payment_status: PaymentStatus
    status: BookingStatus
    driver_id: uuid.UUID | None = None
    driver_name: str | None = None
    late_penalty_amount: float = 0
    notes: str | None = None
    created_at: datetime.datetime | None = None
