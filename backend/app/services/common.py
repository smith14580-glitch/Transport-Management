import re
from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from app.core.config import settings

TZ = ZoneInfo(settings.app_timezone)
CENT = Decimal("0.01")


def money(value: float | int | str | Decimal | None) -> Decimal:
    if value is None:
        return Decimal("0.00")
    return Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


def to_local(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=TZ)
    return value.astimezone(TZ)


def datetime_on(day: date, hhmm: str = "00:00") -> datetime:
    hour, minute = (int(part) for part in hhmm.split(":"))
    return datetime.combine(day, time(hour=hour, minute=minute), tzinfo=TZ)


def today_local() -> date:
    return datetime.now(TZ).date()


def start_of_day(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=TZ)


def end_of_day(day: date) -> datetime:
    return datetime.combine(day + timedelta(days=1), time.min, tzinfo=TZ)


def normalize_phone(phone: str) -> str:
    return re.sub(r"[\s\-()]", "", phone or "")


def date_only(value: datetime) -> date:
    return value.astimezone(TZ).date()
