import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # e.g. "create_staff", "update_order_status", "delete_product", "change_role"

    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # "user", "order", "product", "coupon", etc.

    entity_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    old_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)

    admin: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} by {self.admin_id}>"


from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.user import User
