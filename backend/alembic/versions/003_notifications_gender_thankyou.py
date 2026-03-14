"""Add notifications table, user.gender, order.thank_you_email_sent

Revision ID: 003_notifications_gender_thankyou
Revises: 002_nullable_product_category
Create Date: 2026-03-14
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "003_notifications_gender_thankyou"
down_revision = "002_nullable_product_category"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Add gender column to users (if not already present)
    has_gender = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='gender'"
    )).fetchone()
    if not has_gender:
        op.add_column("users", sa.Column("gender", sa.String(10), nullable=True))

    # 2. Add thank_you_email_sent to orders (if not already present)
    has_tyes = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='thank_you_email_sent'"
    )).fetchone()
    if not has_tyes:
        op.add_column(
            "orders",
            sa.Column("thank_you_email_sent", sa.Boolean(), nullable=False, server_default="false"),
        )

    # 3. Create notifications table (skip if already exists)
    has_table = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.tables WHERE table_name='notifications'"
    )).fetchone()
    if not has_table:
        op.create_table(
            "notifications",
            sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
            sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
            sa.Column("type", sa.String(50), nullable=False),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("data", sa.JSON(), nullable=False, server_default="{}"),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        )
        op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
        op.create_index("ix_notifications_type", "notifications", ["type"])
        op.create_index("ix_notifications_is_read", "notifications", ["is_read"])
        op.create_index("ix_notifications_created_at", "notifications", ["created_at"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_column("orders", "thank_you_email_sent")
    op.drop_column("users", "gender")
