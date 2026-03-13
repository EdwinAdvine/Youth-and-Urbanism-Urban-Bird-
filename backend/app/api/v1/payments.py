from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import stripe
import uuid

from app.database import get_db
from app.config import settings
from app.models.payment import Payment
from app.models.order import Order, OrderStatusHistory
from app.models.user import User
from app.api.deps import get_current_active_user
from app.utils.payments.mpesa_stk import mpesa_client

router = APIRouter()
stripe.api_key = settings.stripe_secret_key


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
        select(Payment).where(Payment.order_id == order.id, Payment.gateway == "card")
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
                    select(Payment).where(Payment.order_id == order.id, Payment.gateway == "card")
                )
                payment = payment_result.scalar_one_or_none()
                if payment:
                    payment.status = "completed"
                    payment.gateway_transaction_id = intent["id"]

    return {"received": True}
