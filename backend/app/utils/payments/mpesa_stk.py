import base64
from datetime import datetime
from typing import Any
import httpx
from app.config import settings


class MpesaSTKClient:
    SANDBOX_BASE = "https://sandbox.safaricom.co.ke"
    PRODUCTION_BASE = "https://api.safaricom.co.ke"

    @property
    def base_url(self) -> str:
        return self.SANDBOX_BASE if settings.mpesa_environment == "sandbox" else self.PRODUCTION_BASE

    async def _get_access_token(self) -> str:
        credentials = f"{settings.mpesa_consumer_key}:{settings.mpesa_consumer_secret}"
        encoded = base64.b64encode(credentials.encode()).decode()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials",
                headers={"Authorization": f"Basic {encoded}"},
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["access_token"]

    def _get_password(self, timestamp: str) -> str:
        raw = f"{settings.mpesa_shortcode}{settings.mpesa_passkey}{timestamp}"
        return base64.b64encode(raw.encode()).decode()

    async def initiate_stk_push(
        self,
        phone_number: str,
        amount: int,
        order_number: str,
        description: str = "Urban Bird Payment",
    ) -> dict[str, Any]:
        """Initiate STK Push. Returns response with CheckoutRequestID."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        token = await self._get_access_token()

        # Normalize phone: 254XXXXXXXXX
        phone = phone_number.strip().replace(" ", "")
        if phone.startswith("0"):
            phone = "254" + phone[1:]
        elif phone.startswith("+"):
            phone = phone[1:]

        payload = {
            "BusinessShortCode": settings.mpesa_shortcode,
            "Password": self._get_password(timestamp),
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": settings.mpesa_shortcode,
            "PhoneNumber": phone,
            "CallBackURL": settings.mpesa_callback_url,
            "AccountReference": order_number,
            "TransactionDesc": description[:13],
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/mpesa/stkpush/v1/processrequest",
                json=payload,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

    async def query_stk_status(self, checkout_request_id: str) -> dict[str, Any]:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        token = await self._get_access_token()

        payload = {
            "BusinessShortCode": settings.mpesa_shortcode,
            "Password": self._get_password(timestamp),
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/mpesa/stkpushquery/v1/query",
                json=payload,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=30,
            )
            response.raise_for_status()
            return response.json()


mpesa_client = MpesaSTKClient()
