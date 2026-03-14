from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

from app.database import get_db
from app.redis import get_redis
from app.config import settings
from app.limiter import limiter
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, RefreshRequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest, UserBasic
)
from app.utils.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, create_reset_token
)
from app.api.deps import get_current_active_user
from app.services.email_service import send_welcome_email, send_password_reset
from app.services.notification_service import create_notification
from jose import JWTError
import asyncio

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    # Check duplicate email
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check duplicate phone
    if data.phone:
        result = await db.execute(select(User).where(User.phone == data.phone))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Phone already registered")

    user = User(
        email=data.email,
        phone=data.phone,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role="customer",
        gender=data.gender,
    )
    db.add(user)
    await db.flush()

    access_token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    refresh_token, jti = create_refresh_token({"sub": str(user.id)})

    # Store refresh token JTI in Redis
    redis = await get_redis()
    await redis.setex(
        f"refresh:{jti}",
        settings.refresh_token_expire_days * 86400,
        str(user.id)
    )

    # Set refresh token as HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth",
    )

    # Create welcome in-platform notification (before commit so it's part of the transaction)
    await create_notification(
        db,
        user.id,
        "welcome",
        "Welcome to Urban Bird! 🎉",
        f"Hi {user.first_name}, thanks for joining! Use code WELCOME10 for free shipping on your first order.",
        {},
    )

    await db.commit()

    # Fetch top 3 featured products for welcome email (fire-and-forget)
    async def _send_welcome_with_products():
        from sqlalchemy import select as _select
        from sqlalchemy.orm import selectinload as _selectinload
        from app.models.product import Product as _Product
        from app.database import AsyncSessionLocal
        from app.utils.formatters import format_ksh as _fmt
        try:
            async with AsyncSessionLocal() as _db:
                res = await _db.execute(
                    _select(_Product)
                    .options(_selectinload(_Product.images))
                    .where(_Product.is_featured == True, _Product.is_active == True)
                    .order_by(_Product.purchase_count.desc())
                    .limit(3)
                )
                products = res.scalars().all()
                suggestions = []
                for p in products:
                    image = None
                    for img in p.images:
                        if img.is_primary:
                            image = img.url
                            break
                    if not image and p.images:
                        image = p.images[0].url
                    suggestions.append({
                        "name": p.name,
                        "slug": p.slug,
                        "price": _fmt(p.price),
                        "image": image,
                    })
        except Exception:
            suggestions = []
        await send_welcome_email(user.email, user.first_name, suggestions)

    asyncio.create_task(_send_welcome_with_products())

    return TokenResponse(
        access_token=access_token,
        user=UserBasic.model_validate(user)
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email, User.is_deleted == False))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    user.last_login = datetime.now(timezone.utc)

    access_token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    refresh_token, jti = create_refresh_token({"sub": str(user.id)})

    redis = await get_redis()
    await redis.setex(f"refresh:{jti}", settings.refresh_token_expire_days * 86400, str(user.id))

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth",
    )

    return TokenResponse(access_token=access_token, user=UserBasic.model_validate(user))


@router.post("/logout")
async def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    current_user: User = Depends(get_current_active_user),
):
    if refresh_token:
        try:
            payload = decode_token(refresh_token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti:
                redis = await get_redis()
                # Blacklist the refresh JTI and the access token JTI
                remaining_ttl = max(1, int(exp - datetime.now(timezone.utc).timestamp()))
                await redis.setex(f"blacklist:{jti}", remaining_ttl, "1")
                await redis.delete(f"refresh:{jti}")
        except JWTError:
            pass

    response.delete_cookie("refresh_token", path="/api/v1/auth")
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=dict)
async def refresh_token(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token not found")

    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        jti = payload.get("jti")
        user_id = payload.get("sub")

        redis = await get_redis()
        stored = await redis.get(f"refresh:{jti}")
        if not stored:
            raise HTTPException(status_code=401, detail="Refresh token expired or revoked")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access_token = create_access_token({"sub": user_id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email, User.is_deleted == False))
    user = result.scalar_one_or_none()

    # Always return success (security: don't reveal if email exists)
    if user:
        token = create_reset_token()
        redis = await get_redis()
        await redis.setex(f"pwd_reset:{token}", 3600, str(user.id))
        reset_url = f"{settings.frontend_url}/account/reset-password?token={token}"
        asyncio.create_task(
            send_password_reset(user.email, user.first_name, reset_url)
        )

    return {"message": "If that email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    redis = await get_redis()
    user_id = await redis.get(f"pwd_reset:{data.token}")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(data.new_password)
    await redis.delete(f"pwd_reset:{data.token}")

    return {"message": "Password reset successfully"}


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.password_hash = hash_password(data.new_password)
    return {"message": "Password changed successfully"}
