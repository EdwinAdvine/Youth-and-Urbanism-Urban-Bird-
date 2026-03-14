"""
Email notification service using aiosmtplib + Jinja2 templates.
"""
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import aiosmtplib
from jinja2 import Environment, PackageLoader, select_autoescape

from app.config import settings

logger = logging.getLogger(__name__)

# Jinja2 environment - loads templates from app/templates/email/
try:
    jinja_env = Environment(
        loader=PackageLoader("app", "templates/email"),
        autoescape=select_autoescape(["html"]),
    )
except Exception:
    jinja_env = None


async def _send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> bool:
    """Core email sender. Returns True on success."""
    if not settings.smtp_host:
        logger.warning("Email not configured - skipping send to %s", to_email)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
    msg["To"] = to_email

    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    use_credentials = bool(settings.smtp_user and settings.smtp_password)
    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user if use_credentials else None,
            password=settings.smtp_password if use_credentials else None,
            start_tls=use_credentials,
        )
        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False


def _render(template_name: str, **kwargs) -> str:
    """Render a Jinja2 HTML template."""
    if jinja_env is None:
        return f"<p>{kwargs}</p>"
    tmpl = jinja_env.get_template(template_name)
    return tmpl.render(**kwargs)


async def send_welcome_email(
    to_email: str,
    first_name: str,
    suggested_products: Optional[list] = None,
) -> bool:
    html = _render(
        "welcome.html",
        first_name=first_name,
        shop_url=settings.frontend_url,
        suggested_products=suggested_products or [],
    )
    return await _send_email(to_email, "Welcome to Urban Bird! 🎉", html)


async def send_order_confirmation(
    to_email: str,
    first_name: str,
    order_number: str,
    order_total: str,
    order_url: str,
) -> bool:
    html = _render(
        "order_confirmation.html",
        first_name=first_name,
        order_number=order_number,
        order_total=order_total,
        order_url=order_url,
        shop_url=settings.frontend_url,
    )
    return await _send_email(
        to_email,
        f"Order Confirmed - {order_number}",
        html,
    )


async def send_shipping_notification(
    to_email: str,
    first_name: str,
    order_number: str,
    tracking_number: str,
    order_url: str,
) -> bool:
    html = _render(
        "shipping.html",
        first_name=first_name,
        order_number=order_number,
        tracking_number=tracking_number,
        order_url=order_url,
    )
    return await _send_email(
        to_email,
        f"Your order {order_number} has been shipped! 📦",
        html,
    )


async def send_admin_new_order(
    order_number: str,
    customer_name: str,
    customer_email: str,
    order_total: str,
    item_count: int,
    order_admin_url: str,
) -> bool:
    html = _render(
        "admin_new_order.html",
        admin_name=settings.admin_name,
        order_number=order_number,
        customer_name=customer_name,
        customer_email=customer_email,
        order_total=order_total,
        item_count=item_count,
        order_admin_url=order_admin_url,
    )
    return await _send_email(
        settings.admin_email,
        f"New Order Received — {order_number}",
        html,
    )


async def send_admin_dispatch_notification(
    order_number: str,
    customer_name: str,
    tracking_number: str,
    order_admin_url: str,
) -> bool:
    html = _render(
        "admin_dispatch.html",
        admin_name=settings.admin_name,
        order_number=order_number,
        customer_name=customer_name,
        tracking_number=tracking_number,
        order_admin_url=order_admin_url,
    )
    return await _send_email(
        settings.admin_email,
        f"Order Dispatched — {order_number}",
        html,
    )


async def send_delivery_thankyou(
    to_email: str,
    first_name: str,
    order_number: str,
    order_url: str,
) -> bool:
    html = _render(
        "thank_you.html",
        first_name=first_name,
        order_number=order_number,
        order_url=order_url,
        shop_url=settings.frontend_url,
    )
    return await _send_email(
        to_email,
        "Thank you for your Urban Bird order! ❤️",
        html,
    )


async def send_password_reset(
    to_email: str,
    first_name: str,
    reset_url: str,
) -> bool:
    html = _render(
        "password_reset.html",
        first_name=first_name,
        reset_url=reset_url,
    )
    return await _send_email(to_email, "Reset Your Urban Bird Password", html)


async def send_newsletter_campaign(
    to_email: str,
    name: Optional[str],
    subject: str,
    body: str,
) -> bool:
    html = _render(
        "newsletter.html",
        name=name or "Valued Customer",
        body=body,
        shop_url=settings.frontend_url,
    )
    return await _send_email(to_email, subject, html)


_REASON_LABELS = {
    "wrong_size": "Wrong Size",
    "doesnt_fit": "Doesn't Fit",
    "defective": "Defective / Damaged",
    "not_as_described": "Not as Described",
    "changed_mind": "Changed Mind",
    "other": "Other",
}

_RESOLUTION_LABELS = {
    "refund": "Refund",
    "exchange": "Exchange",
    "store_credit": "Store Credit",
}


async def send_return_submitted(
    to_email: str,
    first_name: str,
    order_number: str,
    reason: str,
    order_url: str,
) -> bool:
    html = _render(
        "return_submitted.html",
        first_name=first_name,
        order_number=order_number,
        reason_label=_REASON_LABELS.get(reason, reason),
        order_url=order_url,
    )
    return await _send_email(to_email, f"Return Request Received — {order_number}", html)


async def send_admin_new_return(
    order_number: str,
    customer_name: str,
    customer_email: str,
    reason: str,
    customer_note: Optional[str],
    return_admin_url: str,
) -> bool:
    html = _render(
        "admin_new_return.html",
        admin_name=settings.admin_name,
        order_number=order_number,
        customer_name=customer_name,
        customer_email=customer_email,
        reason_label=_REASON_LABELS.get(reason, reason),
        customer_note=customer_note,
        return_admin_url=return_admin_url,
    )
    return await _send_email(settings.admin_email, f"New Return Request — {order_number}", html)


async def send_return_approved(
    to_email: str,
    first_name: str,
    order_number: str,
    resolution_type: str,
    refund_amount: Optional[str],
    admin_note: Optional[str],
    order_url: str,
) -> bool:
    html = _render(
        "return_approved.html",
        first_name=first_name,
        order_number=order_number,
        resolution_label=_RESOLUTION_LABELS.get(resolution_type, resolution_type),
        refund_amount=refund_amount,
        admin_note=admin_note,
        order_url=order_url,
    )
    return await _send_email(to_email, f"Your Return Has Been Approved — {order_number}", html)


async def send_return_rejected(
    to_email: str,
    first_name: str,
    order_number: str,
    admin_note: str,
    order_url: str,
) -> bool:
    html = _render(
        "return_rejected.html",
        first_name=first_name,
        order_number=order_number,
        admin_note=admin_note,
        order_url=order_url,
    )
    return await _send_email(to_email, f"Update on Your Return Request — {order_number}", html)


async def send_return_completed(
    to_email: str,
    first_name: str,
    order_number: str,
    resolution_type: str,
    refund_amount: Optional[str],
    order_url: str,
    shop_url: str,
) -> bool:
    html = _render(
        "return_completed.html",
        first_name=first_name,
        order_number=order_number,
        resolution_type=resolution_type,
        resolution_label=_RESOLUTION_LABELS.get(resolution_type, resolution_type),
        refund_amount=refund_amount,
        order_url=order_url,
        shop_url=shop_url,
    )
    return await _send_email(to_email, f"Your Return Is Complete — {order_number}", html)
