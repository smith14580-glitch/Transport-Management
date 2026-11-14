"""Initial HK Transport schema.

Revision ID: 20261114_0001
Revises:
Create Date: 2026-11-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20261114_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

UUID = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID, primary_key=True, nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=30), nullable=False, server_default="manager"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "cars",
        sa.Column("id", UUID, primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=30), nullable=False, server_default="SUV"),
        sa.Column("seats", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("transmission", sa.String(length=30), nullable=False, server_default="Automatic"),
        sa.Column("fuel", sa.String(length=30), nullable=False, server_default="Petrol"),
        sa.Column("plate_no", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="available"),
        sa.Column("rate_with_driver_hour", sa.Numeric(12, 2), nullable=True),
        sa.Column("rate_with_driver_day", sa.Numeric(12, 2), nullable=True),
        sa.Column("rate_self_hour", sa.Numeric(12, 2), nullable=True),
        sa.Column("rate_self_day", sa.Numeric(12, 2), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("plate_no", name="uq_cars_plate_no"),
        sa.CheckConstraint(
            "status IN ('available','on_rent','maintenance','not_available')",
            name="cars_status_check",
        ),
        sa.CheckConstraint(
            "category IN ('SUV','Sedan','Van','Hatchback')",
            name="cars_category_check",
        ),
        sa.CheckConstraint(
            "transmission IN ('Automatic','Manual')",
            name="cars_transmission_check",
        ),
        sa.CheckConstraint("fuel IN ('Petrol','Diesel')", name="cars_fuel_check"),
    )
    op.create_index("ix_cars_plate_no", "cars", ["plate_no"])

    op.create_table(
        "customers",
        sa.Column("id", UUID, primary_key=True, nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=False),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_customers_phone", "customers", ["phone"])

    op.create_table(
        "settings",
        sa.Column("key", sa.String(length=120), primary_key=True, nullable=False),
        sa.Column("value", sa.Text(), nullable=False, server_default=""),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "sale_records",
        sa.Column("id", UUID, primary_key=True, nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("car_name", sa.String(length=160), nullable=False),
        sa.Column("car_details", sa.String(length=500), nullable=True),
        sa.Column("party_name", sa.String(length=160), nullable=False),
        sa.Column("party_phone", sa.String(length=40), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("amount_paid", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("balance_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("payment_method", sa.String(length=20), nullable=False),
        sa.Column("record_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("type IN ('sale','purchase')", name="sale_records_type_check"),
        sa.CheckConstraint("status IN ('completed','pending')", name="sale_records_status_check"),
        sa.CheckConstraint(
            "payment_method IN ('cash','bank','split')",
            name="sale_records_method_check",
        ),
        sa.CheckConstraint("price >= 0", name="sale_records_price_check"),
    )
    op.create_index("ix_sale_records_record_date", "sale_records", ["record_date"])

    op.create_table(
        "bookings",
        sa.Column("id", UUID, primary_key=True, nullable=False),
        sa.Column("booking_code", sa.String(length=40), nullable=False),
        sa.Column("customer_id", UUID, nullable=False),
        sa.Column("customer_name", sa.String(length=160), nullable=False),
        sa.Column("customer_phone", sa.String(length=40), nullable=False),
        sa.Column("car_id", UUID, nullable=True),
        sa.Column("car_name", sa.String(length=160), nullable=False),
        sa.Column("pickup_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("return_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("driver_option", sa.String(length=30), nullable=False),
        sa.Column("duration_value", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("duration_unit", sa.String(length=20), nullable=False, server_default="days"),
        sa.Column("rate_per_unit", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("advance_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("amount_paid", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("balance_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("payment_plan", sa.String(length=40), nullable=False),
        sa.Column("payment_status", sa.String(length=20), nullable=False, server_default="unpaid"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="upcoming"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], name="fk_bookings_customer", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["car_id"], ["cars.id"], name="fk_bookings_car", ondelete="SET NULL"),
        sa.UniqueConstraint("booking_code", name="uq_bookings_booking_code"),
        sa.CheckConstraint("return_datetime > pickup_datetime", name="bookings_dates_check"),
        sa.CheckConstraint(
            "status IN ('upcoming','active','completed','cancelled')",
            name="bookings_status_check",
        ),
        sa.CheckConstraint(
            "payment_status IN ('unpaid','partial','paid')",
            name="bookings_payment_status_check",
        ),
        sa.CheckConstraint(
            "driver_option IN ('with_driver','self_drive')",
            name="bookings_driver_option_check",
        ),
        sa.CheckConstraint(
            "duration_unit IN ('hours','days')",
            name="bookings_duration_unit_check",
        ),
        sa.CheckConstraint(
            "payment_plan IN ('full_cash','full_bank','half_cash_half_bank','half_now_half_later')",
            name="bookings_payment_plan_check",
        ),
    )
    op.create_index("ix_bookings_booking_code", "bookings", ["booking_code"])
    op.create_index("ix_bookings_customer_id", "bookings", ["customer_id"])
    op.create_index("ix_bookings_car_id", "bookings", ["car_id"])
    op.create_index("ix_bookings_pickup_datetime", "bookings", ["pickup_datetime"])
    op.create_index("ix_bookings_status", "bookings", ["status"])

    op.create_table(
        "payments",
        sa.Column("id", UUID, primary_key=True, nullable=False),
        sa.Column("booking_id", UUID, nullable=True),
        sa.Column("booking_code", sa.String(length=40), nullable=True),
        sa.Column("sale_id", UUID, nullable=True),
        sa.Column("customer_name", sa.String(length=160), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("cash_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("bank_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("method", sa.String(length=20), nullable=False),
        sa.Column("payment_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reference", sa.String(length=120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], name="fk_payments_booking", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["sale_id"], ["sale_records.id"], name="fk_payments_sale", ondelete="SET NULL"),
        sa.CheckConstraint("method IN ('cash','bank','split')", name="payments_method_check"),
        sa.CheckConstraint("amount >= 0", name="payments_amount_check"),
    )
    op.create_index("ix_payments_booking_id", "payments", ["booking_id"])
    op.create_index("ix_payments_sale_id", "payments", ["sale_id"])
    op.create_index("ix_payments_payment_date", "payments", ["payment_date"])

    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.execute(
        """
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_no_overlap_excl
        EXCLUDE USING gist (
            car_id WITH =,
            tstzrange(pickup_datetime, return_datetime, '[)') WITH &&
        )
        WHERE (status IN ('upcoming', 'active'))
        """
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap_excl"
    )
    op.drop_table("payments")
    op.drop_table("bookings")
    op.drop_table("sale_records")
    op.drop_table("settings")
    op.drop_table("customers")
    op.drop_table("cars")
    op.drop_table("users")
