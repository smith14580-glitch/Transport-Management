import datetime
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SaleType = Literal["sale", "purchase"]
SaleStatus = Literal["completed", "pending"]
PaymentMethod = Literal["cash", "bank", "split"]


class SaleRecordCreate(BaseModel):
    type: SaleType
    car_name: str = Field(min_length=1, max_length=160)
    car_details: str | None = None
    party_name: str = Field(min_length=1, max_length=160)
    party_phone: str | None = None
    price: float = Field(gt=0)
    amount_paid: float = Field(default=0, ge=0)
    payment_method: PaymentMethod
    record_date: datetime.date
    notes: str | None = None


class SaleRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: SaleType
    car_name: str
    car_details: str | None = None
    party_name: str
    party_phone: str | None = None
    price: float
    amount_paid: float
    balance_amount: float
    payment_method: PaymentMethod
    record_date: datetime.datetime
    status: SaleStatus
    notes: str | None = None
    created_at: datetime.datetime | None = None
