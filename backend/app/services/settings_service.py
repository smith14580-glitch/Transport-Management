import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Setting
from app.schemas.settings import BusinessSettingsOut, BusinessSettingsUpdate

DEFAULT_SETTINGS: dict[str, tuple[str, str]] = {
    "business_name": ("HK Transport", "Business name"),
    "tagline": ("Rent a Car — Shadman Town, Karachi", "Business tagline"),
    "phones": (
        json.dumps(["0315-2776677", "0309-2531242", "0322-6320927"]),
        "Contact phones (JSON array)",
    ),
    "sale_purchase_phone": ("0317-2873887", "Sale & purchase phone (2 Rist Transport)"),
    "address": (
        "Shop # B-13, KDA Flats, Sector 14-B, Shadman Town, Karachi",
        "Shop address",
    ),
    "default_rate_with_driver_hour": ("2000", "Default rate with driver — per hour (PKR)"),
    "default_rate_with_driver_day": ("15000", "Default rate with driver — per day (PKR)"),
    "default_rate_self_hour": ("1500", "Default rate self drive — per hour (PKR)"),
    "default_rate_self_day": ("10000", "Default rate self drive — per day (PKR)"),
    "late_return_penalty_per_hour": ("1000", "Late return penalty per hour (PKR)"),
    "late_penalty_enabled": ("true", "Enable late return penalty"),
}


def get_setting_map(db: Session) -> dict[str, str]:
    rows = db.execute(select(Setting)).scalars().all()
    values = {key: default for key, (default, _desc) in DEFAULT_SETTINGS.items()}
    for row in rows:
        values[row.key] = row.value
    return values


def _parse_phones(raw: str) -> list[str]:
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(item) for item in parsed if str(item).strip()]
    except (TypeError, ValueError):
        pass
    return [part.strip() for part in raw.split(",") if part.strip()]


def _as_float(raw: str) -> float:
    try:
        return float(raw)
    except (TypeError, ValueError):
        return 0.0


def get_business_settings(db: Session) -> BusinessSettingsOut:
    values = get_setting_map(db)
    return BusinessSettingsOut(
        business_name=values.get("business_name", ""),
        tagline=values.get("tagline", ""),
        phones=_parse_phones(values.get("phones", "[]")),
        sale_purchase_phone=values.get("sale_purchase_phone", ""),
        address=values.get("address", ""),
        default_rate_with_driver_hour=_as_float(values.get("default_rate_with_driver_hour", "0")),
        default_rate_with_driver_day=_as_float(values.get("default_rate_with_driver_day", "0")),
        default_rate_self_hour=_as_float(values.get("default_rate_self_hour", "0")),
        default_rate_self_day=_as_float(values.get("default_rate_self_day", "0")),
        late_return_penalty_per_hour=_as_float(values.get("late_return_penalty_per_hour", "1000")),
        late_penalty_enabled=str(values.get("late_penalty_enabled", "true")).strip().lower()
        in {"true", "1", "yes", "on"},
    )


def _upsert(db: Session, key: str, value: str, description: str | None = None) -> None:
    row = db.get(Setting, key)
    if row is None:
        db.add(Setting(key=key, value=value, description=description))
    else:
        row.value = value
        if description:
            row.description = description


def update_business_settings(
    db: Session, payload: BusinessSettingsUpdate
) -> BusinessSettingsOut:
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if value is None:
            continue
        if key == "phones":
            _upsert(db, key, json.dumps([str(item) for item in value]))
        elif key == "late_penalty_enabled":
            _upsert(db, key, "true" if bool(value) else "false")
        else:
            _upsert(db, key, str(value))
    db.flush()
    return get_business_settings(db)
