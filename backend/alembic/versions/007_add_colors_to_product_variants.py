"""Add colors JSONB column to product_variants

Revision ID: 007_add_colors_to_product_variants
Revises: 006_guest_token
Create Date: 2026-03-15

This migration adds the `colors` JSONB column that was added to the
ProductVariant model in commit 7b0c80e but was never migrated.
Its absence caused 500 errors on every endpoint that loads variants
(products list, product detail, cart, admin product save).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "007_add_colors_to_product_variants"
down_revision = "006_guest_token"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "product_variants",
        sa.Column("colors", JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("product_variants", "colors")
