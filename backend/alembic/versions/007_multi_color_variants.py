"""Add colors JSONB column to product_variants for multi-color support

Revision ID: 007_multi_color_variants
Revises: 005_merge
Create Date: 2026-03-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "007_multi_color_variants"
down_revision = "005_merge"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "product_variants",
        sa.Column("colors", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("product_variants", "colors")
