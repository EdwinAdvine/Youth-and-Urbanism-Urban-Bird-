"""Merge branches 004_stock_reservation and 006_guest_token into single head

Both 004 and 006 were created with down_revision pointing to 003, producing
two independent branch heads. This merge migration converges them so that
`alembic upgrade head` works on a fresh database without the
"Multiple heads are present" error.

Revision ID: 005_merge
Revises: 004_stock_reservation, 006_guest_token
Create Date: 2026-03-15
"""
from alembic import op

revision = "005_merge"
down_revision = ("004_stock_reservation", "006_guest_token")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass  # No schema changes — merge only


def downgrade() -> None:
    pass
