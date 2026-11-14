from pydantic import BaseModel


class DashboardSummaryOut(BaseModel):
    cars_out_today: int
    todays_bookings: int
    revenue_collected: float
    pending_payments: float
    fleet_available: int
    fleet_total: int
    upcoming_bookings_count: int
