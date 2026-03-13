from fastapi import Depends, HTTPException, status, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import uuid

from app.database import get_db
from app.redis import get_redis
from app.utils.security import decode_token
from app.models.user import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise credentials_exception
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        jti: str = payload.get("jti")
        if not user_id or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Check blacklist
    redis = await get_redis()
    if await redis.get(f"blacklist:{jti}"):
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id), User.is_deleted == False))
    user = result.scalar_one_or_none()
    if not user:
        raise credentials_exception
    return user


async def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
    return user


async def get_admin_user(user: User = Depends(get_current_active_user)) -> User:
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


async def get_super_admin(user: User = Depends(get_current_active_user)) -> User:
    """Only super_admin role — used for Staff management, Settings, and other owner-only endpoints."""
    if user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        jti: str = payload.get("jti")
        if not user_id or token_type != "access":
            return None
        redis = await get_redis()
        if await redis.get(f"blacklist:{jti}"):
            return None
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id), User.is_deleted == False))
        return result.scalar_one_or_none()
    except Exception:
        return None
