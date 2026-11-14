"""Add drivers module and late-return penalty support.

Revision ID: 20261115_0002
Revises: 20261114_0001
Create Date: 2026-11-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20261115_0002"
down_revision: Union[str, None] = "20261114_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

UUID = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "drivers",
        sa.Column("id", UUID, primary_key=True, nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("cnic", sa.String(length=20), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=False),
        sa.Column("licence_no", sa.String(length=60), nullable=False),
        sa.Column("licence_expiry", sa.Date(), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("emergency_contact", sa.String(length=80), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="available"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("photo", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "status IN ('available','on_trip','off_duty')",
            name="drivers_status_check",
        ),
    )

    op.add_column("bookings", sa.Column("driver_id", UUID, nullable=True))
    op.add_column("bookings", sa.Column("driver_name", sa.String(length=160), nullable=True))
    op.add_column(
        "bookings",
        sa.Column("late_penalty_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.create_foreign_key(
        "fk_bookings_driver",
        "bookings",
        "drivers",
        ["driver_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_bookings_driver_id", "bookings", ["driver_id"])

    # New settings keys (idempotent).
    op.execute(
        """
        INSERT INTO settings (key, value, description)
        VALUES
          ('late_return_penalty_per_hour', '1000', 'Late return penalty per hour (PKR)'),
          ('late_penalty_enabled', 'true', 'Enable late return penalty')
        ON CONFLICT (key) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM settings WHERE key IN ('late_return_penalty_per_hour','late_penalty_enabled')")
    op.drop_index("ix_bookings_driver_id", table_name="bookings")
    op.drop_constraint("fk_bookings_driver", "bookings", type_="foreignkey")
    op.drop_column("bookings", "late_penalty_amount")
    op.drop_column("bookings", "driver_name")
    op.drop_column("bookings", "driver_id")
    op.drop_table("drivers")
