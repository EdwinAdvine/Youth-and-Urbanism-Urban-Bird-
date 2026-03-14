"""Make products.category_id nullable for products without a category

Revision ID: 002_nullable_product_category
Revises: 001_guest_checkout
Create Date: 2026-03-14
"""
from alembic import op
import sqlalchemy as sa

revision = "002_nullable_product_category"
down_revision = "001_guest_checkout"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("products", "category_id", nullable=True)
    # Change ondelete from RESTRICT to SET NULL
    op.drop_constraint("products_category_id_fkey", "products", type_="foreignkey")
    op.create_foreign_key(
        "products_category_id_fkey", "products", "categories",
        ["category_id"], ["id"], ondelete="SET NULL"
    )


def downgrade() -> None:
    op.drop_constraint("products_category_id_fkey", "products", type_="foreignkey")
    op.create_foreign_key(
        "products_category_id_fkey", "products", "categories",
        ["category_id"], ["id"], ondelete="RESTRICT"
    )
    op.alter_column("products", "category_id", nullable=False)
