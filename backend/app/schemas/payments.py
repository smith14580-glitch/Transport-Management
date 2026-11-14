import datetime
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

PaymentMethod = Literal["cash", "bank", "split"]


class PaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    method: PaymentMethod
    cash_amount: float | None = Field(default=None, ge=0)
    bank_amount: float | None = Field(default=None, ge=0)
    payment_date: datetime.date
    reference: str | None = None
    notes: str | None = None


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_id: uuid.UUID | None
    booking_code: str | None
    sale_id: uuid.UUID | None
    customer_name: str
    amount: float
    cash_amount: float
    bank_amount: float
    method: PaymentMethod
    payment_date: datetime.datetime
    reference: str | None = None
    notes: str | None = None
    created_at: datetime.datetime | None = None
