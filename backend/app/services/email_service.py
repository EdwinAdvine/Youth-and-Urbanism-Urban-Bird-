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
    if not settings.smtp_host or not settings.smtp_user:
        logger.warning("Email not configured - skipping send to %s", to_email)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
    msg["To"] = to_email

    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True,
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


async def send_welcome_email(to_email: str, first_name: str) -> bool:
    html = _render(
        "welcome.html",
        first_name=first_name,
        shop_url=settings.frontend_url,
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
