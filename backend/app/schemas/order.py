from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime, date
import uuid


class CheckoutRequest(BaseModel):
    shipping_full_name: str
    shipping_phone: str
    shipping_address_line_1: str
    shipping_address_line_2: str | None = None
    shipping_city: str
    shipping_county: str
    shipping_rate_id: str | None = None
    payment_method: str  # mpesa, stripe, cod
    coupon_code: str | None = None
    mpesa_phone: str | None = None
    customer_notes: str | None = None


class OrderItemOut(BaseModel):
    id: uuid.UUID
    product_name: str
    variant_sku: str
    size: str
    color_name: str
    product_image: str | None = None
    quantity: int
    unit_price: Decimal
    total_price: Decimal

    class Config:
        from_attributes = True


class OrderStatusHistoryOut(BaseModel):
    id: uuid.UUID
    old_status: str | None = None
    new_status: str
    note: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: uuid.UUID
    order_number: str
    status: str
    subtotal: Decimal
    discount_amount: Decimal
    coupon_code: str | None = None
    shipping_cost: Decimal
    tax_amount: Decimal
    total: Decimal
    shipping_full_name: str
    shipping_city: str
    shipping_county: str
    shipping_method: str | None = None
    tracking_number: str | None = None
    carrier: str | None = None
    estimated_delivery: date | None = None
    payment_method: str
    payment_status: str
    items: list[OrderItemOut] = []
    status_history: list[OrderStatusHistoryOut] = []
    customer_notes: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderListItem(BaseModel):
    id: uuid.UUID
    order_number: str
    status: str
    total: Decimal
    payment_status: str
    item_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateOrderStatus(BaseModel):
    status: str
    note: str | None = None
    tracking_number: str | None = None
    carrier: str | None = None
