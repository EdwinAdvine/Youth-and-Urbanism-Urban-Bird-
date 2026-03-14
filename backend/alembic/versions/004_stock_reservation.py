"""Add reserved_quantity to product_variants

Revision ID: 004_stock_reservation
Revises: 003_notifications_gender_thankyou
Create Date: 2026-03-14
"""
from alembic import op
import sqlalchemy as sa

revision = "004_stock_reservation"
down_revision = "003_notifications_gender_thankyou"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "product_variants",
        sa.Column("reserved_quantity", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("product_variants", "reserved_quantity")
