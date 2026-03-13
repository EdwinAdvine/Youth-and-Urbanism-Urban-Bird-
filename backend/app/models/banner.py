import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Banner(Base):
    __tablename__ = "banners"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(400), nullable=True)
    cta_text: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cta_link: Mapped[str | None] = mapped_column(String(500), nullable=True)

    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    mobile_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    overlay_color: Mapped[str | None] = mapped_column(String(20), nullable=True, default="rgba(0,0,0,0.35)")

    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Banner {self.title}>"
