import csv
import io
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.database import get_db
from app.models.newsletter import NewsletterSubscriber
from app.api.deps import get_admin_user
from app.models.user import User

router = APIRouter()


class SubscribeRequest(BaseModel):
    email: EmailStr
    name: str | None = None
    source: str | None = "footer"


@router.post("/subscribe", status_code=201)
async def subscribe(data: SubscribeRequest, db: AsyncSession = Depends(get_db)):
    # Check if already subscribed
    result = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == data.email.lower())
    )
    existing = result.scalar_one_or_none()

    if existing:
        if existing.is_active:
            return {"message": "You're already subscribed!", "already_subscribed": True}
        # Re-activate if they previously unsubscribed
        existing.is_active = True
        existing.name = data.name or existing.name
        await db.commit()
        return {"message": "Welcome back! You're subscribed again.", "already_subscribed": False}

    subscriber = NewsletterSubscriber(
        email=data.email.lower(),
        name=data.name,
        source=data.source,
    )
    db.add(subscriber)
    await db.commit()
    return {"message": "Thanks for subscribing! Exclusive deals are heading your way.", "already_subscribed": False}


@router.post("/unsubscribe")
async def unsubscribe(data: SubscribeRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == data.email.lower())
    )
    subscriber = result.scalar_one_or_none()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Email not found")
    subscriber.is_active = False
    await db.commit()
    return {"message": "You've been unsubscribed."}


# ─── Admin Endpoints ──────────────────────────────────────────────────────────

@router.get("/admin/subscribers")
async def list_subscribers(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
):
    query = select(NewsletterSubscriber).order_by(NewsletterSubscriber.created_at.desc())
    if search:
        query = query.where(
            NewsletterSubscriber.email.ilike(f"%{search}%") |
            NewsletterSubscriber.name.ilike(f"%{search}%")
        )
    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    subs = result.scalars().all()

    total_result = await db.execute(select(func.count(NewsletterSubscriber.id)))
    active_result = await db.execute(
        select(func.count(NewsletterSubscriber.id)).where(NewsletterSubscriber.is_active == True)
    )

    return {
        "total": total_result.scalar_one(),
        "active": active_result.scalar_one(),
        "subscribers": [
            {
                "id": str(s.id),
                "email": s.email,
                "name": s.name,
                "source": s.source,
                "is_active": s.is_active,
                "created_at": s.created_at.isoformat(),
            }
            for s in subs
        ],
    }


@router.get("/admin/subscribers/export-csv")
async def export_subscribers_csv(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(NewsletterSubscriber)
        .where(NewsletterSubscriber.is_active == True)
        .order_by(NewsletterSubscriber.created_at.desc())
    )
    subs = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Email", "Name", "Source", "Subscribed At"])
    for s in subs:
        writer.writerow([s.email, s.name or "", s.source or "", s.created_at.strftime("%Y-%m-%d")])

    output.seek(0)
    filename = f"urban-bird-subscribers-{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.delete("/admin/subscribers/{subscriber_id}", status_code=204)
async def delete_subscriber(
    subscriber_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    import uuid as _uuid
    result = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.id == _uuid.UUID(subscriber_id))
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    await db.delete(sub)
