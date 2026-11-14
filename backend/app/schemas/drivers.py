import datetime
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DriverStatus = Literal["available", "on_trip", "off_duty"]


class DriverCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=160)
    age: int = Field(default=0, ge=0, le=120)
    date_of_birth: datetime.date | None = None
    cnic: str = Field(min_length=1, max_length=20)
    phone: str = Field(min_length=1, max_length=40)
    licence_no: str = Field(min_length=1, max_length=60)
    licence_expiry: datetime.date | None = None
    address: str | None = None
    emergency_contact: str | None = None
    status: DriverStatus = "available"
    notes: str | None = None
    photo: str | None = None


class DriverUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=160)
    age: int | None = Field(default=None, ge=0, le=120)
    date_of_birth: datetime.date | None = None
    cnic: str | None = Field(default=None, min_length=1, max_length=20)
    phone: str | None = Field(default=None, min_length=1, max_length=40)
    licence_no: str | None = Field(default=None, min_length=1, max_length=60)
    licence_expiry: datetime.date | None = None
    address: str | None = None
    emergency_contact: str | None = None
    status: DriverStatus | None = None
    notes: str | None = None
    photo: str | None = None


class DriverOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    age: int
    date_of_birth: datetime.date | None = None
    cnic: str
    phone: str
    licence_no: str
    licence_expiry: datetime.date | None = None
    address: str | None = None
    emergency_contact: str | None = None
    status: DriverStatus
    notes: str | None = None
    photo: str | None = None
    created_at: datetime.datetime | None = None
