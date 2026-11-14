from pydantic import BaseModel, Field


class BusinessSettingsOut(BaseModel):
    business_name: str
    tagline: str
    phones: list[str]
    sale_purchase_phone: str
    address: str
    default_rate_with_driver_hour: float
    default_rate_with_driver_day: float
    default_rate_self_hour: float
    default_rate_self_day: float


class BusinessSettingsUpdate(BaseModel):
    business_name: str | None = None
    tagline: str | None = None
    phones: list[str] | None = None
    sale_purchase_phone: str | None = None
    address: str | None = None
    default_rate_with_driver_hour: float | None = Field(default=None, ge=0)
    default_rate_with_driver_day: float | None = Field(default=None, ge=0)
    default_rate_self_hour: float | None = Field(default=None, ge=0)
    default_rate_self_day: float | None = Field(default=None, ge=0)
