from pydantic import BaseModel
from decimal import Decimal
import uuid


class CartItemAdd(BaseModel):
    variant_id: uuid.UUID
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    variant_id: uuid.UUID
    quantity: int
    unit_price: Decimal
    product_name: str = ""
    product_slug: str = ""
    variant_sku: str = ""
    size: str = ""
    color_name: str = ""
    image_url: str | None = None
    total_price: Decimal = Decimal("0.00")

    class Config:
        from_attributes = True


class CartOut(BaseModel):
    id: uuid.UUID
    items: list[CartItemOut] = []
    subtotal: Decimal = Decimal("0.00")
    coupon_code: str | None = None
    coupon_discount: Decimal = Decimal("0.00")
    item_count: int = 0

    class Config:
        from_attributes = True


class CouponApply(BaseModel):
    code: str
