"""
APScheduler jobs — runs within the FastAPI process.
Handles the 12-hour post-delivery thank-you email.
"""
import logging
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.order import Order
from app.models.user import User
from app.services.email_service import send_delivery_thankyou
from app.services.notification_service import create_notification
from app.config import settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="Africa/Nairobi")


async def _send_thankyou_emails() -> None:
    """Find delivered orders from 12+ hours ago without a thank-you email and send one."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=12)
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(Order)
                .where(
                    Order.status == "delivered",
                    Order.delivered_at <= cutoff,
                    Order.thank_you_email_sent == False,
                    Order.user_id.isnot(None),
                )
                .limit(50)
            )
            orders = result.scalars().all()

            for order in orders:
                user_result = await db.execute(select(User).where(User.id == order.user_id))
                user = user_result.scalar_one_or_none()
                if not user:
                    continue

                order_url = f"{settings.frontend_url}/account/orders/{order.order_number}"
                await send_delivery_thankyou(user.email, user.first_name, order.order_number, order_url)

                await create_notification(
                    db,
                    user.id,
                    "thank_you",
                    "Thank you for your order! ❤️",
                    f"We hope you love your Urban Bird order {order.order_number}. We'd love to hear your feedback!",
                    {"order_number": order.order_number, "order_url": order_url},
                )

                order.thank_you_email_sent = True
                logger.info("Thank-you email sent for order %s", order.order_number)

            await db.commit()
        except Exception as exc:
            logger.error("Error in thank-you email job: %s", exc)
            await db.rollback()


def start_scheduler() -> None:
    scheduler.add_job(
        _send_thankyou_emails,
        trigger="interval",
        minutes=30,
        id="thankyou_emails",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started — thank-you email job running every 30 minutes")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
