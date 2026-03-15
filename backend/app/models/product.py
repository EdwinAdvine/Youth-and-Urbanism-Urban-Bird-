import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Text, Integer, Numeric, JSON, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    seo_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    seo_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    subcategories: Mapped[list["Subcategory"]] = relationship("Subcategory", back_populates="category", cascade="all, delete-orphan")
    products: Mapped[list["Product"]] = relationship("Product", back_populates="category", passive_deletes=True)


class Subcategory(Base):
    __tablename__ = "subcategories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("category_id", "slug", name="uq_subcategory_category_slug"),)

    category: Mapped["Category"] = relationship("Category", back_populates="subcategories")
    products: Mapped[list["Product"]] = relationship("Product", back_populates="subcategory", passive_deletes=True)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    slug: Mapped[str] = mapped_column(String(300), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    short_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    subcategory_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("subcategories.id", ondelete="SET NULL"), nullable=True, index=True)

    # Pricing
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    compare_at_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    cost_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="KES")

    # Status
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft", index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_new_arrival: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_on_sale: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sale_percentage: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Inventory
    total_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    sku_prefix: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # SEO
    seo_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    seo_description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Metadata
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    material: Mapped[str | None] = mapped_column(String(200), nullable=True)
    care_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    weight_grams: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Ratings (denormalized)
    average_rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False, default=Decimal("0.00"))
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    purchase_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="products")
    subcategory: Mapped["Subcategory | None"] = relationship("Subcategory", back_populates="products")
    variants: Mapped[list["ProductVariant"]] = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    images: Mapped[list["ProductImage"]] = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.display_order")
    reviews: Mapped[list["ProductReview"]] = relationship("ProductReview", back_populates="product", cascade="all, delete-orphan")

    @property
    def primary_image(self) -> "ProductImage | None":
        for img in self.images:
            if img.is_primary:
                return img
        return self.images[0] if self.images else None


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    sku: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    size: Mapped[str] = mapped_column(String(20), nullable=False)
    color_name: Mapped[str] = mapped_column(String(50), nullable=False)
    color_hex: Mapped[str] = mapped_column(String(7), nullable=False, default="#000000")
    colors: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    price_adjustment: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    stock_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reserved_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    barcode: Mapped[str | None] = mapped_column(String(50), nullable=True)
    weight_grams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    product: Mapped["Product"] = relationship("Product", back_populates="variants")
    images: Mapped[list["ProductImage"]] = relationship("ProductImage", back_populates="variant")
    inventory_logs: Mapped[list["InventoryLog"]] = relationship("InventoryLog", back_populates="variant")


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    alt_text: Mapped[str | None] = mapped_column(String(300), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    product: Mapped["Product"] = relationship("Product", back_populates="images")
    variant: Mapped["ProductVariant | None"] = relationship("ProductVariant", back_populates="images")


class ProductReview(Base):
    __tablename__ = "product_reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_verified_purchase: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    helpful_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    images: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    admin_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("product_id", "user_id", name="uq_review_product_user"),)

    product: Mapped["Product"] = relationship("Product", back_populates="reviews")
    user: Mapped["User"] = relationship("User", back_populates="reviews")


class InventoryLog(Base):
    __tablename__ = "inventory_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, index=True)
    change_type: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity_change: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_before: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reference_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    variant: Mapped["ProductVariant"] = relationship("ProductVariant", back_populates="inventory_logs")


from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.user import User
