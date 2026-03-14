from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import stripe
import uuid
import hmac
import hashlib
import json
import logging

from app.database import get_db
from app.config import settings
from app.models.payment import Payment
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.product import ProductVariant, Product
from app.models.user import User
from app.api.deps import get_current_active_user, get_optional_user
from app.utils.payments.mpesa_stk import mpesa_client
from app.utils.payments.paystack import paystack_client
from app.services.email_service import send_order_confirmation, send_admin_new_order, send_low_stock_alert
from app.services.sms_service import send_order_confirmation_sms
from app.utils.formatters import format_ksh
import asyncio

router = APIRouter()
stripe.api_key = settings.stripe_secret_key
logger = logging.getLogger(__name__)


class MpesaInitiateRequest(BaseModel):
    order_id: uuid.UUID
    phone: str


class StripeIntentRequest(BaseModel):
    order_id: uuid.UUID


@router.post("/mpesa/initiate")
async def initiate_mpesa(
    data: MpesaInitiateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Order).where(Order.id == data.order_id, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        response = await mpesa_client.initiate_stk_push(
            phone_number=data.phone,
            amount=int(order.total),
            order_number=order.order_number,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"M-Pesa error: {str(e)}")

    # Update payment record with checkout request ID
    payment_result = await db.execute(
        select(Payment).where(Payment.order_id == order.id, Payment.gateway == "mpesa")
    )
    payment = payment_result.scalar_one_or_none()
    if payment:
        payment.mpesa_checkout_request_id = response.get("CheckoutRequestID")
        payment.mpesa_phone = data.phone
        payment.gateway_response = response

    return {
        "checkout_request_id": response.get("CheckoutRequestID"),
        "merchant_request_id": response.get("MerchantRequestID"),
        "message": response.get("CustomerMessage", "STK Push sent. Enter your PIN."),
    }


@router.post("/mpesa/callback")
async def mpesa_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Safaricom callback after customer enters PIN."""
    # Validate that the callback originates from Safaricom's published IP ranges
    # See: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
    SAFARICOM_IP_RANGES = {
        "196.201.214.", "196.201.213.", "196.201.216.", "196.201.218.",
        "196.201.209.", "196.201.210.",
    }
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "").split(",")[0].strip()
    if settings.environment == "production" and not any(client_ip.startswith(pfx) for pfx in SAFARICOM_IP_RANGES):
        logger.warning(f"M-Pesa callback from unexpected IP: {client_ip}")
        raise HTTPException(status_code=403, detail="Forbidden")

    body = await request.json()
    stk_callback = body.get("Body", {}).get("stkCallback", {})
    checkout_request_id = stk_callback.get("CheckoutRequestID")
    result_code = stk_callback.get("ResultCode")

    if not checkout_request_id:
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    payment_result = await db.execute(
        select(Payment).where(Payment.mpesa_checkout_request_id == checkout_request_id)
    )
    payment = payment_result.scalar_one_or_none()

    if payment:
        payment.gateway_response = stk_callback
        if result_code == 0:
            # Payment successful
            callback_metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])
            receipt_number = next(
                (item["Value"] for item in callback_metadata if item["Name"] == "MpesaReceiptNumber"),
                None
            )
            payment.status = "completed"
            payment.mpesa_receipt_number = receipt_number
            payment.gateway_transaction_id = receipt_number

            # Update order
            order_result = await db.execute(select(Order).where(Order.id == payment.order_id))
            order = order_result.scalar_one_or_none()
            if order:
                order.payment_status = "paid"
                order.status = "confirmed"
                db.add(OrderStatusHistory(
                    order_id=order.id,
                    old_status="pending_payment",
                    new_status="confirmed",
                    note=f"M-Pesa payment confirmed. Receipt: {receipt_number}",
                ))
        else:
            payment.status = "failed"

    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@router.get("/mpesa/status/{checkout_request_id}")
async def check_mpesa_status(
    checkout_request_id: str,
    current_user: User = Depends(get_current_active_user),
):
    try:
        status_response = await mpesa_client.query_stk_status(checkout_request_id)
        return status_response
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"M-Pesa query error: {str(e)}")


@router.post("/stripe/create-intent")
async def create_stripe_intent(
    data: StripeIntentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Order).where(Order.id == data.order_id, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        intent = stripe.PaymentIntent.create(
            amount=int(order.total * 100),  # Stripe uses smallest currency unit
            currency="kes",
            metadata={"order_id": str(order.id), "order_number": order.order_number},
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")

    # Update payment record
    payment_result = await db.execute(
        select(Payment).where(Payment.order_id == order.id, Payment.gateway == "stripe")
    )
    payment = payment_result.scalar_one_or_none()
    if payment:
        payment.stripe_payment_intent_id = intent.id

    return {"client_secret": intent.client_secret}


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        order_id = intent.get("metadata", {}).get("order_id")
        if order_id:
            order_result = await db.execute(select(Order).where(Order.id == uuid.UUID(order_id)))
            order = order_result.scalar_one_or_none()
            if order:
                order.payment_status = "paid"
                order.status = "confirmed"
                db.add(OrderStatusHistory(
                    order_id=order.id,
                    old_status="pending_payment",
                    new_status="confirmed",
                    note=f"Stripe payment confirmed. Intent: {intent['id']}",
                ))
                payment_result = await db.execute(
                    select(Payment).where(Payment.order_id == order.id, Payment.gateway == "stripe")
                )
                payment = payment_result.scalar_one_or_none()
                if payment:
                    payment.status = "completed"
                    payment.gateway_transaction_id = intent["id"]

    return {"received": True}


# ─── Paystack ─────────────────────────────────────────────────────────────────

class PaystackInitRequest(BaseModel):
    order_id: uuid.UUID


async def _send_payment_confirmed_emails(order: Order, db: AsyncSession) -> None:
    """Send order confirmation to customer and new-order notice to all admins after payment."""
    total_str = format_ksh(order.total)
    track_url = f"{settings.frontend_url}/track-order?order_number={order.order_number}"
    admin_order_url = f"{settings.frontend_url}/admin/orders/{order.id}"

    # Resolve customer email / name
    email_to = None
    first_name = order.shipping_full_name.split()[0] if order.shipping_full_name else "Customer"
    phone = None
    if order.user_id:
        user_result = await db.execute(select(User).where(User.id == order.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            email_to = user.email
            first_name = user.first_name or first_name
            phone = user.phone
    if not email_to and order.guest_email:
        email_to = order.guest_email

    customer_email_for_admin = email_to or ""
    customer_name = order.shipping_full_name or first_name

    if email_to:
        asyncio.create_task(
            send_order_confirmation(email_to, first_name, order.order_number, total_str, track_url)
        )
    if phone:
        asyncio.create_task(
            send_order_confirmation_sms(phone, order.order_number, total_str)
        )

    # Notify all admins
    admin_result = await db.execute(
        select(User).where(User.role.in_(["admin", "super_admin"]), User.is_active == True)
    )
    admin_users = admin_result.scalars().all()
    items_result = await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))
    item_count = len(items_result.scalars().all())
    for admin_user in admin_users:
        asyncio.create_task(
            send_admin_new_order(
                order_number=order.order_number,
                customer_name=customer_name,
                customer_email=customer_email_for_admin,
                order_total=total_str,
                item_count=item_count,
                order_admin_url=admin_order_url,
                to_email=admin_user.email,
            )
        )


async def _get_order_items(order: Order, db: AsyncSession):
    """Fetch all order items for a given order."""
    items_result = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order.id)
    )
    return items_result.scalars().all()


async def _finalize_order_stock(order: Order, db: AsyncSession) -> None:
    """Convert stock reservations to actual sales on payment confirmation."""
    items = await _get_order_items(order, db)
    for item in items:
        if item.variant_id:
            var_result = await db.execute(
                select(ProductVariant).where(ProductVariant.id == item.variant_id)
            )
            variant = var_result.scalar_one_or_none()
            if variant:
                variant.stock_quantity = max(0, variant.stock_quantity - item.quantity)
                variant.reserved_quantity = max(0, variant.reserved_quantity - item.quantity)
                if item.product_id:
                    prod_result = await db.execute(
                        select(Product).where(Product.id == item.product_id)
                    )
                    product = prod_result.scalar_one_or_none()
                    if product:
                        product.total_stock = max(0, product.total_stock - item.quantity)
                        product.purchase_count += item.quantity
                        threshold = product.low_stock_threshold or 5
                        if variant.stock_quantity <= threshold:
                            asyncio.create_task(
                                send_low_stock_alert(
                                    product_name=product.name,
                                    sku=variant.sku,
                                    size=variant.size or "",
                                    color=variant.color_name or "",
                                    stock_quantity=variant.stock_quantity,
                                    admin_url=f"{settings.frontend_url}/admin/inventory",
                                )
                            )


async def _release_reservation(order: Order, db: AsyncSession) -> None:
    """Release stock reservations on payment failure (stock_quantity unchanged)."""
    items = await _get_order_items(order, db)
    for item in items:
        if item.variant_id:
            var_result = await db.execute(
                select(ProductVariant).where(ProductVariant.id == item.variant_id)
            )
            variant = var_result.scalar_one_or_none()
            if variant:
                variant.reserved_quantity = max(0, variant.reserved_quantity - item.quantity)


@router.post("/paystack/initialize")
async def initialize_paystack(
    data: PaystackInitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Initialize a Paystack transaction. Returns authorization_url to redirect user."""
    query = select(Order).where(Order.id == data.order_id)
    if current_user:
        query = query.where(Order.user_id == current_user.id)
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Order is already paid")

    # Use the authenticated user's email, or fall back to the guest email on the order
    email = (current_user.email if current_user else None) or order.guest_email
    if not email:
        raise HTTPException(status_code=400, detail="No email available for Paystack transaction")

    callback_url = f"{settings.frontend_url}/order-confirmation/{order.order_number}"

    try:
        resp = await paystack_client.initialize(
            email=email,
            amount_kes=float(order.total),
            reference=order.order_number,
            callback_url=callback_url,
        )
    except Exception as e:
        logger.error(f"Paystack initialize exception: {e}")
        raise HTTPException(status_code=502, detail="Payment service temporarily unavailable. Please try again.")

    if not resp.get("status"):
        logger.error(f"Paystack initialize failed: {resp.get('message')}")
        raise HTTPException(status_code=502, detail="Payment service temporarily unavailable. Please try again.")

    tx_data = resp["data"]

    # Update payment record with initial gateway response
    payment_result = await db.execute(
        select(Payment).where(Payment.order_id == order.id, Payment.gateway == "paystack")
    )
    payment = payment_result.scalar_one_or_none()
    if payment:
        payment.gateway_response = tx_data
        payment.gateway_transaction_id = tx_data.get("reference")

    return {
        "authorization_url": tx_data["authorization_url"],
        "reference": tx_data["reference"],
        "access_code": tx_data["access_code"],
    }


@router.post("/paystack/retry/{order_number}")
async def retry_paystack(
    order_number: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Re-initialize Paystack for an order that has a failed or incomplete payment."""
    query = select(Order).where(Order.order_number == order_number)
    if current_user:
        query = query.where(Order.user_id == current_user.id)
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Order is already paid")

    if order.status not in ("pending_payment",):
        raise HTTPException(status_code=400, detail="Order cannot be retried in its current state")

    email = (current_user.email if current_user else None) or order.guest_email
    if not email:
        raise HTTPException(status_code=400, detail="No email available for payment")

    callback_url = f"{settings.frontend_url}/order-confirmation/{order.order_number}"

    try:
        resp = await paystack_client.initialize(
            email=email,
            amount_kes=float(order.total),
            reference=order.order_number,
            callback_url=callback_url,
        )
    except Exception as e:
        logger.error(f"Paystack retry exception: {e}")
        raise HTTPException(status_code=502, detail="Payment service temporarily unavailable. Please try again.")

    if not resp.get("status"):
        logger.error(f"Paystack retry failed: {resp.get('message')}")
        raise HTTPException(status_code=502, detail="Payment service temporarily unavailable. Please try again.")

    tx_data = resp["data"]

    payment_result = await db.execute(
        select(Payment).where(Payment.order_id == order.id, Payment.gateway == "paystack")
    )
    payment = payment_result.scalar_one_or_none()
    if payment:
        payment.status = "pending"
        payment.gateway_response = tx_data
        payment.gateway_transaction_id = tx_data.get("reference")

    return {
        "authorization_url": tx_data["authorization_url"],
        "reference": tx_data["reference"],
        "access_code": tx_data["access_code"],
    }


@router.get("/paystack/verify/{reference}")
async def verify_paystack(
    reference: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Verify a Paystack transaction after the user returns from the payment page."""
    try:
        resp = await paystack_client.verify(reference)
    except Exception as e:
        logger.error(f"Paystack verify exception: {e}")
        raise HTTPException(status_code=502, detail="Could not verify payment. Please contact support.")

    if not resp.get("status"):
        raise HTTPException(status_code=400, detail=resp.get("message", "Verification failed"))

    tx = resp["data"]

    # Look up order — use SELECT FOR UPDATE to prevent race with webhook
    order_result = await db.execute(
        select(Order).where(Order.order_number == reference).with_for_update()
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Idempotency: if already processed, return early
    if order.payment_status == "paid":
        return {"status": "success", "message": "Payment already confirmed"}

    payment_result = await db.execute(
        select(Payment).where(Payment.order_id == order.id, Payment.gateway == "paystack").with_for_update()
    )
    payment = payment_result.scalar_one_or_none()

    if tx.get("status") == "success":
        if payment:
            payment.status = "completed"
            payment.gateway_transaction_id = str(tx.get("id", ""))
            payment.gateway_response = tx

        old_status = order.status
        order.payment_status = "paid"
        order.status = "confirmed"
        db.add(OrderStatusHistory(
            order_id=order.id,
            old_status=old_status,
            new_status="confirmed",
            note=f"Paystack payment verified. Ref: {reference}",
        ))

        # Convert stock reservations to actual sales
        await _finalize_order_stock(order, db)

        # Send confirmation emails (non-blocking)
        await _send_payment_confirmed_emails(order, db)

        return {"status": "success", "message": "Payment confirmed"}

    else:
        if payment:
            payment.status = "failed"
            payment.gateway_response = tx

        # Release stock reservations (stock_quantity is unchanged — was never decremented)
        await _release_reservation(order, db)

        return {"status": tx.get("status", "failed"), "message": tx.get("gateway_response", "Payment not completed")}


@router.post("/paystack/webhook")
async def paystack_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Paystack webhook — real-time payment confirmation."""
    payload = await request.body()
    sig = request.headers.get("x-paystack-signature", "")

    if not settings.paystack_webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook not configured")
    computed = hmac.new(
        settings.paystack_webhook_secret.encode(),
        payload,
        hashlib.sha512,
    ).hexdigest()
    if not hmac.compare_digest(computed, sig):
        logger.warning("Paystack webhook: invalid signature received")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    body = json.loads(payload)
    event = body.get("event", "")
    data = body.get("data", {})

    if event == "charge.success":
        reference = data.get("reference", "")
        if reference:
            # Use SELECT FOR UPDATE to prevent race with frontend verify
            order_result = await db.execute(
                select(Order).where(Order.order_number == reference).with_for_update()
            )
            order = order_result.scalar_one_or_none()
            if order and order.payment_status != "paid":
                old_status = order.status
                order.payment_status = "paid"
                order.status = "confirmed"
                db.add(OrderStatusHistory(
                    order_id=order.id,
                    old_status=old_status,
                    new_status="confirmed",
                    note=f"Paystack webhook: charge.success. Ref: {reference}",
                ))
                payment_result = await db.execute(
                    select(Payment).where(
                        Payment.order_id == order.id,
                        Payment.gateway == "paystack",
                    ).with_for_update()
                )
                payment = payment_result.scalar_one_or_none()
                if payment:
                    payment.status = "completed"
                    payment.gateway_transaction_id = str(data.get("id", ""))
                    payment.gateway_response = data
                # Convert reservations to actual sales
                await _finalize_order_stock(order, db)

                # Send confirmation emails (non-blocking)
                await _send_payment_confirmed_emails(order, db)

    elif event == "charge.failed":
        reference = data.get("reference", "")
        if reference:
            order_result = await db.execute(
                select(Order).where(Order.order_number == reference).with_for_update()
            )
            order = order_result.scalar_one_or_none()
            if order and order.payment_status != "paid":
                payment_result = await db.execute(
                    select(Payment).where(
                        Payment.order_id == order.id,
                        Payment.gateway == "paystack",
                    ).with_for_update()
                )
                payment = payment_result.scalar_one_or_none()
                if payment:
                    payment.status = "failed"
                    payment.gateway_response = data
                # Release stock reservations
                await _release_reservation(order, db)

    return {"status": "ok"}
