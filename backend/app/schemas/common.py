from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiErrorBody(BaseModel):
    code: str
    message: str


class ErrorEnvelope(BaseModel):
    success: bool = False
    error: ApiErrorBody


class SuccessEnvelope(BaseModel, Generic[T]):
    success: bool = True
    data: T


class AvailabilityResult(BaseModel):
    available: bool
    conflicting_booking_code: str | None = None


def to_float(value: Any) -> float:
    if value is None:
        return 0.0
    return float(value)
