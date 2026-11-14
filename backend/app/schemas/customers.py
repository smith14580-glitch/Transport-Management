import datetime
import uuid

from pydantic import BaseModel, ConfigDict


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str
    address: str | None = None
    notes: str | None = None
    created_at: datetime.datetime | None = None


class CustomerSummaryOut(BaseModel):
    customer_id: uuid.UUID
    full_name: str
    phone: str
    total_bookings: int
    total_rent_amount: float
    total_paid: float
    total_pending: float
