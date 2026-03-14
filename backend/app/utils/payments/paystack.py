import httpx
from typing import Any
from app.config import settings


class PaystackClient:
    BASE = "https://api.paystack.co"

    @property
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {settings.paystack_secret_key}",
            "Content-Type": "application/json",
        }

    async def initialize(
        self,
        email: str,
        amount_kes: float,
        reference: str,
        callback_url: str,
    ) -> dict[str, Any]:
        """Initialize a Paystack transaction. Amount is in KES (will be multiplied by 100)."""
        payload = {
            "email": email,
            "amount": int(round(amount_kes * 100)),  # Paystack smallest unit
            "currency": "KES",
            "reference": reference,
            "callback_url": callback_url,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.BASE}/transaction/initialize",
                json=payload,
                headers=self._headers,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()

    async def verify(self, reference: str) -> dict[str, Any]:
        """Verify a transaction by reference."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.BASE}/transaction/verify/{reference}",
                headers=self._headers,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()


paystack_client = PaystackClient()
