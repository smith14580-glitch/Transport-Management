import uuid

from sqlalchemy.exc import IntegrityError

from app.core.errors import ApiError


def parse_uuid(value: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        return None


def conflict_from_integrity(exc: IntegrityError) -> ApiError:
    detail = str(getattr(exc, "orig", exc)).lower()
    if "bookings_no_overlap" in detail or "exclusion" in detail:
        return ApiError(
            409,
            "DOUBLE_BOOKING",
            "This car already has an overlapping booking for the selected time.",
        )
    if "booking_code" in detail:
        return ApiError(409, "BOOKING_CODE_CONFLICT", "Booking code conflict, please retry.")
    if "plate_no" in detail:
        return ApiError(409, "PLATE_EXISTS", "A car with this plate number already exists.")
    if "email" in detail:
        return ApiError(409, "EMAIL_EXISTS", "A user with this email already exists.")
    return ApiError(409, "CONFLICT", "The request conflicts with existing data.")
