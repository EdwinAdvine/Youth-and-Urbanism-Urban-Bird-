import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class SiteSetting(Base):
    __tablename__ = "site_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    value: Mapped[dict | str | None] = mapped_column(JSON, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    editor: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<SiteSetting {self.key}>"


# Default setting keys and their initial values
DEFAULT_SETTINGS = {
    "store_name": "Urban Bird",
    "store_tagline": "Premium Urban Streetwear Kenya",
    "whatsapp_number": "254700000000",
    "whatsapp_message": "Hello Urban Bird! I'd like some help with my order.",
    "low_stock_threshold": 10,
    "announcement_messages": [
        {"text": "Free delivery on orders above KSh 5,000", "link": "/shop", "linkLabel": "Shop Now →"},
        {"text": "New arrivals dropping every week", "link": "/shop?sort=latest", "linkLabel": "Explore Now →"},
        {"text": "Use code URBAN10 for 10% off your first order", "link": "/shop", "linkLabel": "Shop Now →"},
    ],
    "social_links": {
        "instagram": "https://instagram.com/urbanbird_ke",
        "facebook": "https://facebook.com/urbanbird",
        "tiktok": "https://tiktok.com/@urbanbird_ke",
        "twitter": "https://twitter.com/urbanbird_ke",
        "pinterest": "https://pinterest.com/urbanbird_ke",
        "whatsapp": "https://wa.me/254700000000",
    },
}


from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.user import User
