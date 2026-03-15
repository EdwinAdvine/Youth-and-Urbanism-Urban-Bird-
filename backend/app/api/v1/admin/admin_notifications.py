"""
Admin notification endpoints.
"""
import uuid
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.api.deps import get_admin_user
from app.services.notification_service import (
    get_admin_notifications,
    get_admin_unread_count,
    mark_notification_read,
    mark_all_read,
    delete_admin_notification,
    delete_all_admin_notifications,
)

router = APIRouter()


@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    notifications, total = await get_admin_notifications(db, page, limit)
    return {
        "items": [_serialize(n) for n in notifications],
        "total": total,
        "page": page,
        "limit": limit,
        "unread_count": await get_admin_unread_count(db),
    }


@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    count = await get_admin_unread_count(db)
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    await mark_notification_read(db, notification_id, None)
    return {"message": "Marked as read"}


@router.post("/read-all")
async def read_all(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    await mark_all_read(db, None)
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    found = await delete_admin_notification(db, notification_id)
    if not found:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}


@router.delete("")
async def delete_all_notifications(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    count = await delete_all_admin_notifications(db)
    return {"message": f"Deleted {count} notifications"}


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
