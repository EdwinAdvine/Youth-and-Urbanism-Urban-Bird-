import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Text, JSON, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ReturnRequest(Base):
    __tablename__ = "return_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # What the customer is returning
    items: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # e.g. [{"variant_id": "...", "quantity": 1, "reason": "wrong_size"}]

    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    # wrong_size | doesnt_fit | defective | not_as_described | changed_mind | other

    customer_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_urls: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Workflow status
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="requested", index=True)
    # requested → approved → item_received → completed | rejected

    # Resolution
    resolution_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # refund | exchange | store_credit

    refund_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    exchange_order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="return_requests")
    user: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<ReturnRequest {self.id} status={self.status}>"


from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.user import User
