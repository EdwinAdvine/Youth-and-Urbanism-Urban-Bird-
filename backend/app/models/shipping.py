import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ShippingZone(Base):
    __tablename__ = "shipping_zones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    counties: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    rates: Mapped[list["ShippingRate"]] = relationship("ShippingRate", back_populates="zone", cascade="all, delete-orphan")


class ShippingRate(Base):
    __tablename__ = "shipping_rates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("shipping_zones.id", ondelete="CASCADE"), nullable=False, index=True)
    method: Mapped[str] = mapped_column(String(50), nullable=False)  # standard, express, pickup
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    free_above: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    estimated_days_min: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_days_max: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    zone: Mapped["ShippingZone"] = relationship("ShippingZone", back_populates="rates")
