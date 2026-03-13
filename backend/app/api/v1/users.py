from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.database import get_db
from app.models.user import User, UserAddress
from app.schemas.user import UserProfile, UserProfileUpdate, AddressCreate, AddressUpdate, AddressResponse
from app.api.deps import get_current_active_user

router = APIRouter()


@router.get("/me", response_model=UserProfile)
async def get_profile(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.patch("/me", response_model=UserProfile)
async def update_profile(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if data.first_name is not None:
        current_user.first_name = data.first_name
    if data.last_name is not None:
        current_user.last_name = data.last_name
    if data.phone is not None:
        current_user.phone = data.phone
    return current_user


@router.get("/me/addresses", response_model=list[AddressResponse])
async def list_addresses(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserAddress).where(UserAddress.user_id == current_user.id).order_by(UserAddress.is_default.desc())
    )
    return result.scalars().all()


@router.post("/me/addresses", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    data: AddressCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if data.is_default:
        await db.execute(
            UserAddress.__table__.update()
            .where(UserAddress.user_id == current_user.id)
            .values(is_default=False)
        )
    address = UserAddress(**data.model_dump(), user_id=current_user.id)
    db.add(address)
    await db.flush()
    return address


@router.patch("/me/addresses/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: uuid.UUID,
    data: AddressUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserAddress).where(UserAddress.id == address_id, UserAddress.user_id == current_user.id)
    )
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    if data.is_default:
        await db.execute(
            UserAddress.__table__.update()
            .where(UserAddress.user_id == current_user.id)
            .values(is_default=False)
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(address, field, value)
    return address


@router.delete("/me/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserAddress).where(UserAddress.id == address_id, UserAddress.user_id == current_user.id)
    )
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    await db.delete(address)
