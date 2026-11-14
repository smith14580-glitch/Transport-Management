import datetime
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CarCategory = Literal["SUV", "Sedan", "Van", "Hatchback"]
Transmission = Literal["Automatic", "Manual"]
Fuel = Literal["Petrol", "Diesel"]
CarStatus = Literal["available", "on_rent", "maintenance", "not_available"]


class CarCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    category: CarCategory = "SUV"
    seats: int = Field(default=5, ge=1, le=100)
    transmission: Transmission = "Automatic"
    fuel: Fuel = "Petrol"
    plate_no: str = Field(min_length=1, max_length=40)
    status: CarStatus = "available"
    rate_with_driver_hour: float | None = Field(default=None, ge=0)
    rate_with_driver_day: float | None = Field(default=None, ge=0)
    rate_self_hour: float | None = Field(default=None, ge=0)
    rate_self_day: float | None = Field(default=None, ge=0)
    notes: str | None = None


class CarUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    category: CarCategory | None = None
    seats: int | None = Field(default=None, ge=1, le=100)
    transmission: Transmission | None = None
    fuel: Fuel | None = None
    plate_no: str | None = Field(default=None, min_length=1, max_length=40)
    status: CarStatus | None = None
    rate_with_driver_hour: float | None = Field(default=None, ge=0)
    rate_with_driver_day: float | None = Field(default=None, ge=0)
    rate_self_hour: float | None = Field(default=None, ge=0)
    rate_self_day: float | None = Field(default=None, ge=0)
    notes: str | None = None


class CarOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    category: CarCategory
    seats: int
    transmission: Transmission
    fuel: Fuel
    plate_no: str
    status: CarStatus
    rate_with_driver_hour: float | None
    rate_with_driver_day: float | None
    rate_self_hour: float | None
    rate_self_day: float | None
    notes: str | None = None
    created_at: datetime.datetime | None = None
