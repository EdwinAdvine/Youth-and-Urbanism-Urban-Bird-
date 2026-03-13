from pydantic import BaseModel, EmailStr
from datetime import datetime
import uuid


class UserProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None


class UserProfile(BaseModel):
    id: uuid.UUID
    email: str
    phone: str | None = None
    first_name: str
    last_name: str
    role: str
    avatar_url: str | None = None
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AddressCreate(BaseModel):
    label: str = "Home"
    full_name: str
    phone: str
    address_line_1: str
    address_line_2: str | None = None
    city: str
    county: str
    postal_code: str | None = None
    is_default: bool = False


class AddressUpdate(AddressCreate):
    pass


class AddressResponse(AddressCreate):
    id: uuid.UUID
    country: str
    created_at: datetime

    class Config:
        from_attributes = True
