"""
SMS notification service using Africa's Talking API.
"""
import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

# Lazy-init Africa's Talking SDK
_at_sms = None


def _get_sms():
    global _at_sms
    if _at_sms is not None:
        return _at_sms
    try:
        import africastalking
        africastalking.initialize(
            username=settings.at_username,
            api_key=settings.at_api_key,
        )
        _at_sms = africastalking.SMS
    except Exception as exc:
        logger.warning("Africa's Talking not available: %s", exc)
        _at_sms = None
    return _at_sms


def _normalize_phone(phone: str) -> str:
    """Convert Kenyan phone to +254 format."""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("07") or phone.startswith("01"):
        return "+254" + phone[1:]
    if phone.startswith("254"):
        return "+" + phone
    return phone


async def send_sms(phone: str, message: str) -> bool:
    """Send an SMS. Returns True on success."""
    if not settings.at_api_key or settings.at_api_key == "your-africastalking-sandbox-api-key":
        logger.info("SMS (not configured) → %s: %s", phone, message[:60])
        return False

    sms = _get_sms()
    if sms is None:
        return False

    recipient = _normalize_phone(phone)
    try:
        response = sms.send(
            message=message,
            recipients=[recipient],
            sender_id=settings.at_sender_id if hasattr(settings, "at_sender_id") else None,
        )
        logger.info("SMS sent to %s: %s", recipient, response)
        return True
    except Exception as exc:
        logger.error("SMS failed to %s: %s", recipient, exc)
        return False


async def send_order_confirmation_sms(phone: str, order_number: str, total: str) -> bool:
    message = (
        f"Hi! Your Urban Bird order {order_number} has been confirmed. "
        f"Total: {total}. We'll notify you when it ships. "
        f"Track: {settings.frontend_url}/account/orders"
    )
    return await send_sms(phone, message)


async def send_shipping_sms(phone: str, order_number: str, tracking: str) -> bool:
    message = (
        f"Urban Bird: Order {order_number} has been shipped! "
        f"Tracking: {tracking}. "
        f"Track: {settings.frontend_url}/account/orders"
    )
    return await send_sms(phone, message)


async def send_mpesa_confirmation_sms(phone: str, order_number: str, amount: str, receipt: str) -> bool:
    message = (
        f"Urban Bird: M-Pesa payment of {amount} received for order {order_number}. "
        f"M-Pesa code: {receipt}. Thank you!"
    )
    return await send_sms(phone, message)


async def send_delivery_sms(phone: str, order_number: str) -> bool:
    message = (
        f"Urban Bird: Order {order_number} has been delivered! "
        f"Thank you for shopping with us. "
        f"Leave a review: {settings.frontend_url}/account/orders"
    )
    return await send_sms(phone, message)
