from pydantic import BaseModel, field_validator
from decimal import Decimal
from datetime import datetime, date
from typing import Literal
import re
import uuid


class CheckoutRequest(BaseModel):
    shipping_full_name: str
    shipping_phone: str
    shipping_address_line_1: str | None = None
    shipping_address_line_2: str | None = None
    shipping_city: str | None = None
    shipping_county: str | None = None
    shipping_rate_id: str | None = None
    payment_method: Literal["paystack", "mpesa", "stripe", "cod"]
    coupon_code: str | None = None
    mpesa_phone: str | None = None
    customer_notes: str | None = None
    guest_email: str | None = None  # required when checking out as guest

    @field_validator("shipping_full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        if len(v) > 100:
            raise ValueError("Name must be 100 characters or fewer")
        return v

    @field_validator("shipping_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\+?[\d\s\-]{7,20}$", v):
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("shipping_address_line_1")
    @classmethod
    def validate_address(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if len(v) > 200:
                raise ValueError("Address must be 200 characters or fewer")
        return v or None

    @field_validator("shipping_address_line_2")
    @classmethod
    def validate_address2(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if len(v) > 200:
                raise ValueError("Address line 2 must be 200 characters or fewer")
        return v or None

    @field_validator("shipping_city", "shipping_county")
    @classmethod
    def validate_location(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if len(v) > 100:
                raise ValueError("Must be 100 characters or fewer")
        return v or None

    @field_validator("customer_notes")
    @classmethod
    def validate_notes(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 500:
            raise ValueError("Notes must be 500 characters or fewer")
        return v

    @field_validator("guest_email")
    @classmethod
    def validate_guest_email(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip().lower()
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
                raise ValueError("Invalid email address")
            if len(v) > 254:
                raise ValueError("Email too long")
        return v

    @field_validator("coupon_code")
    @classmethod
    def validate_coupon(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if len(v) > 50:
                raise ValueError("Coupon code too long")
        return v or None


class OrderItemOut(BaseModel):
    id: uuid.UUID
    variant_id: uuid.UUID | None = None
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
    shipping_phone: str
    shipping_address_1: str
    shipping_address_2: str | None = None
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
    guest_token: str | None = None  # returned only for guest orders on checkout

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
