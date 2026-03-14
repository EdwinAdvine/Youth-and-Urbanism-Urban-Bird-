"""Add guest_token to orders for secure guest order lookup

Revision ID: 006_guest_token
Revises: 003_notifications_gender_thankyou
Create Date: 2026-03-14
"""
from alembic import op
import sqlalchemy as sa

revision = "006_guest_token"
down_revision = "004_stock_reservation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("guest_token", sa.String(36), nullable=True))
    op.create_index("ix_orders_guest_token", "orders", ["guest_token"])


def downgrade() -> None:
    op.drop_index("ix_orders_guest_token", table_name="orders")
    op.drop_column("orders", "guest_token")
