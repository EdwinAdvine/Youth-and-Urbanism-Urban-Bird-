"""Add guest checkout support: nullable user_id on orders/payments, guest_email on orders

Revision ID: 001_guest_checkout
Revises:
Create Date: 2026-03-14
"""
from alembic import op
import sqlalchemy as sa

revision = "001_guest_checkout"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make orders.user_id nullable
    op.alter_column("orders", "user_id", nullable=True)

    # Add guest_email to orders
    op.add_column("orders", sa.Column("guest_email", sa.String(255), nullable=True))

    # Make payments.user_id nullable
    op.alter_column("payments", "user_id", nullable=True)


def downgrade() -> None:
    # Remove guest_email from orders
    op.drop_column("orders", "guest_email")

    # Make orders.user_id NOT NULL again (only safe if no nulls exist)
    op.alter_column("orders", "user_id", nullable=False)

    # Make payments.user_id NOT NULL again
    op.alter_column("payments", "user_id", nullable=False)
