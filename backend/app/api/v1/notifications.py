"""
Customer notification endpoints.
"""
import uuid
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.api.deps import get_current_active_user
from app.services.notification_service import (
    get_user_notifications,
    get_user_unread_count,
    mark_notification_read,
    mark_all_read,
)

router = APIRouter()


@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    notifications, total = await get_user_notifications(db, current_user.id, page, limit)
    return {
        "items": [_serialize(n) for n in notifications],
        "total": total,
        "page": page,
        "limit": limit,
        "unread_count": await get_user_unread_count(db, current_user.id),
    }


@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    count = await get_user_unread_count(db, current_user.id)
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await mark_notification_read(db, notification_id, current_user.id)
    return {"message": "Marked as read"}


@router.post("/read-all")
async def read_all(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await mark_all_read(db, current_user.id)
    return {"message": "All notifications marked as read"}


def _serialize(n) -> dict:
    return {
        "id": str(n.id),
        "type": n.type,
        "title": n.title,
        "message": n.message,
        "data": n.data,
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat(),
    }
