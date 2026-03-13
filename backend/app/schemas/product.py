from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
import uuid


class CategoryBase(BaseModel):
    name: str
    slug: str
    description: str | None = None
    image_url: str | None = None
    banner_url: str | None = None
    display_order: int = 0


class SubcategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    image_url: str | None = None
    display_order: int

    class Config:
        from_attributes = True


class CategoryOut(CategoryBase):
    id: uuid.UUID
    subcategories: list[SubcategoryOut] = []

    class Config:
        from_attributes = True


class ProductImageOut(BaseModel):
    id: uuid.UUID
    url: str
    thumbnail_url: str | None = None
    alt_text: str | None = None
    display_order: int
    is_primary: bool

    class Config:
        from_attributes = True


class ProductVariantOut(BaseModel):
    id: uuid.UUID
    sku: str
    size: str
    color_name: str
    color_hex: str
    price_adjustment: Decimal
    stock_quantity: int
    is_active: bool

    class Config:
        from_attributes = True


class ProductListItem(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    price: Decimal
    compare_at_price: Decimal | None = None
    sale_percentage: int | None = None
    is_on_sale: bool
    is_new_arrival: bool
    average_rating: Decimal
    review_count: int
    total_stock: int
    primary_image: ProductImageOut | None = None
    category_slug: str | None = None
    subcategory_slug: str | None = None

    class Config:
        from_attributes = True


class ProductDetail(ProductListItem):
    description: str
    short_description: str | None = None
    brand: str | None = None
    material: str | None = None
    care_instructions: str | None = None
    tags: list = []
    variants: list[ProductVariantOut] = []
    images: list[ProductImageOut] = []
    seo_title: str | None = None
    seo_description: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    items: list[ProductListItem]
    total: int
    page: int
    limit: int
    pages: int


class ReviewOut(BaseModel):
    id: uuid.UUID
    rating: int
    title: str | None = None
    body: str | None = None
    is_verified_purchase: bool
    helpful_count: int
    images: list[str] = []
    created_at: datetime
    user_name: str = ""

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    rating: int
    title: str | None = None
    body: str | None = None
    images: list[str] = []


class ProductSearchResult(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    price: Decimal
    thumbnail_url: str | None = None

    class Config:
        from_attributes = True


# Admin schemas
class ProductCreate(BaseModel):
    name: str
    slug: str | None = None
    description: str = ""
    short_description: str | None = None
    category_id: uuid.UUID
    subcategory_id: uuid.UUID | None = None
    price: Decimal
    compare_at_price: Decimal | None = None
    cost_price: Decimal | None = None
    status: str = "draft"
    is_featured: bool = False
    is_new_arrival: bool = False
    is_on_sale: bool = False
    sale_percentage: int | None = None
    low_stock_threshold: int = 5
    brand: str | None = None
    material: str | None = None
    care_instructions: str | None = None
    tags: list = []
    seo_title: str | None = None
    seo_description: str | None = None


class ProductUpdate(ProductCreate):
    name: str | None = None
    category_id: uuid.UUID | None = None
    price: Decimal | None = None


class VariantCreate(BaseModel):
    sku: str
    size: str
    color_name: str
    color_hex: str = "#000000"
    price_adjustment: Decimal = Decimal("0.00")
    stock_quantity: int = 0
    barcode: str | None = None
