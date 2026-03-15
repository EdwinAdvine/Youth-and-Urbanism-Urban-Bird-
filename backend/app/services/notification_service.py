"""
Persistent notification service — creates and retrieves in-platform notifications.
user_id=None means the notification is for admin.
"""
import logging
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete

from app.models.notification import Notification

logger = logging.getLogger(__name__)


async def create_notification(
    db: AsyncSession,
    user_id: Optional[uuid.UUID],
    type: str,
    title: str,
    message: str,
    data: Optional[dict] = None,
) -> Notification:
    """Create a notification. user_id=None creates an admin notification."""
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        data=data or {},
    )
    db.add(notif)
    await db.flush()
    return notif


async def create_admin_notification(
    db: AsyncSession,
    type: str,
    title: str,
    message: str,
    data: Optional[dict] = None,
) -> Notification:
    """Shortcut to create an admin-level notification (user_id=None)."""
    return await create_notification(db, None, type, title, message, data)


async def get_user_notifications(
    db: AsyncSession,
    user_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Notification], int]:
    """Return (notifications, total_count) for a customer."""
    base = select(Notification).where(Notification.user_id == user_id)
    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base.order_by(Notification.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return result.scalars().all(), total


async def get_admin_notifications(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Notification], int]:
    """Return (notifications, total_count) for admin (user_id IS NULL)."""
    base = select(Notification).where(Notification.user_id.is_(None))
    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base.order_by(Notification.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return result.scalars().all(), total


async def get_user_unread_count(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count()).where(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
    )
    return result.scalar_one()


async def get_admin_unread_count(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).where(
            Notification.user_id.is_(None),
            Notification.is_read == False,
        )
    )
    return result.scalar_one()


async def mark_notification_read(
    db: AsyncSession,
    notification_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
) -> bool:
    """Mark a single notification as read. user_id=None for admin notifications."""
    if user_id is None:
        where = (Notification.id == notification_id, Notification.user_id.is_(None))
    else:
        where = (Notification.id == notification_id, Notification.user_id == user_id)

    await db.execute(
        update(Notification).where(*where).values(is_read=True)
    )
    return True


async def mark_all_read(
    db: AsyncSession,
    user_id: Optional[uuid.UUID],
) -> None:
    """Mark all notifications as read for a user (or admin if user_id=None)."""
    if user_id is None:
        where = Notification.user_id.is_(None)
    else:
        where = Notification.user_id == user_id

    await db.execute(
        update(Notification).where(where).values(is_read=True)
    )


async def delete_admin_notification(
    db: AsyncSession,
    notification_id: uuid.UUID,
) -> bool:
    """Delete a single admin notification (user_id IS NULL). Returns True if found."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id.is_(None),
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        return False
    await db.delete(notif)
    return True


async def delete_all_admin_notifications(db: AsyncSession) -> int:
    """Delete all admin notifications. Returns count deleted."""
    result = await db.execute(
        delete(Notification).where(Notification.user_id.is_(None))
    )
    return result.rowcount
