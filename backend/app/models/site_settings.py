import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class SiteSetting(Base):
    __tablename__ = "site_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    value: Mapped[dict | str | None] = mapped_column(JSON, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    editor: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<SiteSetting {self.key}>"


# Default setting keys and their initial values
DEFAULT_SETTINGS = {
    # ── Store Identity ────────────────────────────────────────────────────────
    "store_name": "Urban Bird",
    "store_tagline": "Premium Urban Streetwear Kenya",
    "store_logo_url": "",
    "whatsapp_number": "254799075061",
    "whatsapp_message": "Hello Urban Bird! I'd like some help with my order.",
    "low_stock_threshold": 10,
    "announcement_messages": [
        {"text": "Free delivery on orders above KSh 5,000", "link": "/shop", "linkLabel": "Shop Now →"},
        {"text": "New arrivals dropping every week", "link": "/shop?sort=latest", "linkLabel": "Explore Now →"},
        {"text": "Use code URBAN10 for 10% off your first order", "link": "/shop", "linkLabel": "Shop Now →"},
    ],
    "social_links": {
        "instagram": "https://instagram.com/urbanbird_ke",
        "facebook": "https://facebook.com/urbanbird",
        "tiktok": "https://tiktok.com/@urbanbird_ke",
        "twitter": "https://twitter.com/urbanbird_ke",
        "pinterest": "https://pinterest.com/urbanbird_ke",
        "whatsapp": "https://wa.me/254799075061",
    },

    # ── Paystack ──────────────────────────────────────────────────────────────
    "paystack_public_key": "",
    "paystack_secret_key": "",
    "paystack_webhook_secret": "",

    # ── M-Pesa (Safaricom Daraja) ─────────────────────────────────────────────
    "mpesa_environment": "sandbox",
    "mpesa_consumer_key": "",
    "mpesa_consumer_secret": "",
    "mpesa_shortcode": "",
    "mpesa_passkey": "",
    "mpesa_callback_url": "",

    # ── Stripe ────────────────────────────────────────────────────────────────
    "stripe_publishable_key": "",
    "stripe_secret_key": "",
    "stripe_webhook_secret": "",

    # ── Email / SMTP ──────────────────────────────────────────────────────────
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "",
    "smtp_password": "",
    "from_email": "",
    "from_name": "Urban Bird",

    # ── SMS (Africa's Talking) ────────────────────────────────────────────────
    "at_username": "sandbox",
    "at_api_key": "",
    "at_sender_id": "URBANBIRD",

    # ── Checkout Options ──────────────────────────────────────────────────────
    "cod_enabled": True,

    # ── Analytics & Tracking ─────────────────────────────────────────────────
    "ga4_measurement_id": "",   # e.g. G-XXXXXXXXXX
    "meta_pixel_id": "",        # e.g. 1234567890123

    # ── Page Content (CMS) ───────────────────────────────────────────────────────────────
    "page_content_faq": {
        "categories": [
            {"category": "Orders & Payments", "items": [
                {"q": "How do I place an order?", "a": "Browse our shop, select your size and colour, then add items to your cart. Proceed to checkout, fill in your shipping details, choose a payment method (Paystack card/M-Pesa or Cash on Delivery), and confirm your order."},
                {"q": "What payment methods do you accept?", "a": "We accept card payments and M-Pesa via Paystack, and Cash on Delivery (COD) for eligible locations in Kenya."},
                {"q": "Can I modify or cancel my order after placing it?", "a": "You can cancel an order while it is still in 'Pending Payment' or 'Confirmed' status. Once processing begins, cancellations are no longer possible. Log in to My Account → Orders → select your order to cancel."},
                {"q": "How do I track my order?", "a": "Visit our Track My Order page, enter your order number and the email used at checkout. You can also log in and go to My Account → Orders for real-time status updates."},
                {"q": "Will I receive an order confirmation email?", "a": "Yes. A confirmation email is sent to your email address as soon as your order is placed. Check your spam folder if you don't see it within a few minutes."},
            ]},
            {"category": "Shipping & Delivery", "items": [
                {"q": "Do you deliver across Kenya?", "a": "Yes, we deliver to all counties in Kenya. Delivery times and costs vary by location. Nairobi orders typically arrive within 1–2 business days; other regions take 2–5 business days."},
                {"q": "Is there free delivery?", "a": "We offer free delivery on orders above KSh 5,000 within Nairobi. Flat-rate delivery fees apply to other regions and smaller orders."},
                {"q": "How will I know when my order has been shipped?", "a": "You'll receive a notification (and email if enabled) when your order is marked 'Shipped', along with a tracking number if available."},
                {"q": "Do you offer same-day delivery?", "a": "Same-day delivery is available in select Nairobi areas for orders placed before 12:00 PM. Contact us on WhatsApp to confirm availability for your location."},
            ]},
            {"category": "Returns & Exchanges", "items": [
                {"q": "What is your return policy?", "a": "We accept returns within 7 days of delivery for items that are unworn, unwashed, and in original condition with tags attached. Sale items are final sale."},
                {"q": "How do I request a return?", "a": "Log in to My Account → Orders → select the delivered order → click 'Request a Return'. Fill in the reason and submit. We'll review within 1–2 business days."},
                {"q": "How long does a refund take?", "a": "Once we receive and inspect the returned item, refunds are processed within 3–5 business days to your original payment method."},
                {"q": "Can I exchange an item for a different size?", "a": "Yes! When requesting a return, select 'Exchange' as your preferred resolution and note the size you'd like. Exchanges are subject to stock availability."},
            ]},
            {"category": "Products & Sizing", "items": [
                {"q": "How do I find my size?", "a": "Each product page includes a size guide. We recommend measuring your chest, waist, and hips and comparing with our size chart before ordering."},
                {"q": "Are your products true to size?", "a": "Our streetwear pieces are designed with an urban, slightly relaxed fit. If you prefer a closer fit, we recommend sizing down. Refer to the individual size guide on each product page."},
                {"q": "Do you restock sold-out items?", "a": "We regularly restock popular items. Use the wishlist or check back on the product page for restock updates. You can also reach out to us directly."},
                {"q": "How do I care for my Urban Bird garments?", "a": "Machine wash cold, inside out, with similar colours. Do not bleach. Tumble dry low or hang to dry. Iron on low heat if needed. Avoid direct high heat to preserve prints and embroidery."},
            ]},
            {"category": "Account & Privacy", "items": [
                {"q": "Do I need an account to order?", "a": "No, guest checkout is available. However, creating an account lets you track orders, save addresses, manage wishlists, and access your order history easily."},
                {"q": "How do I reset my password?", "a": "Go to Account → Login → click 'Forgot Password'. Enter your email and we'll send you a reset link."},
                {"q": "Is my personal information secure?", "a": "Yes. We take your privacy seriously. Your data is encrypted in transit and we never sell or share your personal information with third parties."},
            ]},
        ]
    },
    "page_content_privacy": {
        "sections": [
            {"title": "Information We Collect", "body": [
                "Personal details you provide when creating an account or placing an order: name, email address, phone number, and delivery address.",
                "Payment information processed securely through Paystack. We do not store your card details on our servers.",
                "Order history, wishlist items, and account preferences.",
                "Technical data such as your IP address, browser type, and pages visited, collected automatically when you use our website.",
            ]},
            {"title": "How We Use Your Information", "body": [
                "To process and fulfil your orders, including sending order confirmations and shipping updates.",
                "To send account-related notifications such as password resets and security alerts.",
                "To improve our website, products, and customer experience based on usage patterns.",
                "To send promotional emails and offers — you can opt out at any time via the unsubscribe link or your account settings.",
            ]},
            {"title": "Sharing Your Information", "body": [
                "We do not sell, rent, or trade your personal information to third parties.",
                "We share your delivery details with our courier partners solely to fulfil your order.",
                "Payment data is processed by Paystack under their own Privacy Policy.",
                "We may disclose information if required by law or to protect the rights and safety of Urban Bird and its customers.",
            ]},
            {"title": "Data Security", "body": [
                "All data transmitted between your browser and our servers is encrypted using HTTPS/TLS.",
                "Passwords are stored as one-way hashes and are never visible to our team.",
                "Access to customer data is restricted to authorised staff only.",
                "Despite our efforts, no method of transmission over the internet is 100% secure. Please use a strong, unique password for your account.",
            ]},
            {"title": "Your Rights", "body": [
                "You may request a copy of the personal data we hold about you by emailing hello@urbanbird.co.ke.",
                "You may request correction or deletion of your data at any time, subject to legal retention requirements.",
                "You may withdraw marketing consent at any time via your account settings or the unsubscribe link in any email.",
                "To exercise any of these rights, contact us at hello@urbanbird.co.ke.",
            ]},
            {"title": "Cookies", "body": [
                "We use essential cookies to keep you logged in and remember your cart.",
                "Analytics cookies (if enabled) help us understand how visitors use our site. You can disable these in your browser settings.",
                "We do not use third-party advertising cookies.",
            ]},
            {"title": "Changes to This Policy", "body": [
                "We may update this Privacy Policy from time to time. Material changes will be communicated via email or a notice on our website.",
                "Continued use of our website after changes constitutes acceptance of the updated policy.",
                "This policy was last updated in March 2026.",
            ]},
        ]
    },
    "page_content_terms": {
        "sections": [
            {"title": "1. Acceptance of Terms", "body": [
                "By accessing or using the Urban Bird website (urbanbird.co.ke), you agree to be bound by these Terms of Service.",
                "If you do not agree to these terms, please do not use our website or services.",
                "We reserve the right to update these terms at any time. Continued use of the site after updates constitutes acceptance.",
            ]},
            {"title": "2. Use of the Website", "body": [
                "You must be at least 18 years old, or have parental/guardian consent, to make purchases on our site.",
                "You agree not to use the website for any unlawful purpose or in any way that could damage or impair Urban Bird's services.",
                "You are responsible for maintaining the confidentiality of your account credentials.",
                "We reserve the right to suspend or terminate accounts that violate these terms.",
            ]},
            {"title": "3. Products & Pricing", "body": [
                "All prices are listed in Kenyan Shillings (KSh) and are inclusive of VAT where applicable.",
                "We reserve the right to change prices at any time without prior notice. Prices at the time of order confirmation are binding.",
                "Product images are for illustration purposes. Actual colours may vary slightly due to screen calibration.",
                "We reserve the right to limit quantities, refuse orders, or cancel orders at our discretion.",
            ]},
            {"title": "4. Orders & Payment", "body": [
                "An order is confirmed only after successful payment or, for Cash on Delivery orders, after our team confirms availability.",
                "Payment is processed securely through Paystack. By paying, you agree to Paystack's Terms of Service.",
                "In the event of a pricing error, we will contact you before processing and you may cancel the order for a full refund.",
                "We accept card payments via Paystack and Cash on Delivery for eligible locations.",
            ]},
            {"title": "5. Shipping & Delivery", "body": [
                "Delivery times are estimates and are not guaranteed. Urban Bird is not liable for delays caused by third-party couriers or circumstances beyond our control.",
                "Risk of loss and title for items pass to you upon delivery to the carrier.",
                "Please review our Shipping Info page for full details on rates and delivery times.",
            ]},
            {"title": "6. Returns & Refunds", "body": [
                "Returns are accepted within 7 days of delivery for unworn, unwashed items in original condition with tags attached.",
                "Sale items are final sale and not eligible for return.",
                "Refunds are processed to the original payment method within 3–5 business days of receiving and inspecting the returned item.",
                "Please review our Returns & Exchanges page for full details on the return process.",
            ]},
            {"title": "7. Intellectual Property", "body": [
                "All content on this website — including logos, images, text, and design — is the property of Urban Bird and is protected by copyright.",
                "You may not reproduce, distribute, or use any content from this site without our prior written permission.",
                "Urban Bird is a trademark of Youth and Urbanism. All rights reserved.",
            ]},
            {"title": "8. Limitation of Liability", "body": [
                "Urban Bird is not liable for any indirect, incidental, or consequential damages arising from your use of our website or products.",
                "Our total liability to you for any claim shall not exceed the amount paid for the relevant order.",
                "We do not warrant that our website will be uninterrupted, error-free, or free of viruses.",
            ]},
            {"title": "9. Governing Law", "body": [
                "These Terms of Service are governed by the laws of Kenya.",
                "Any disputes shall be resolved exclusively in the courts of Nairobi, Kenya.",
                "If any provision of these terms is found to be unenforceable, the remaining provisions will continue in full force.",
            ]},
        ]
    },
    "page_content_shipping": {
        "highlights": [
            {"title": "Nationwide Delivery", "desc": "All 47 counties in Kenya"},
            {"title": "Fast Dispatch", "desc": "Orders packed within 24 hours"},
            {"title": "Free Delivery", "desc": "On orders above KSh 5,000 in Nairobi"},
        ],
        "important_info": [
            "Orders placed before 12:00 PM (EAT) on business days are dispatched the same day.",
            "Delivery times are estimates and may vary during public holidays and peak seasons.",
            "You'll receive a notification when your order is shipped, including a tracking number if available.",
            "Our delivery team will call you before delivering. Please ensure your phone is reachable.",
            "If you're not available at the time of delivery, our courier will attempt re-delivery or contact you to arrange an alternative.",
        ],
        "cod_text": "COD is available for eligible locations. Pay in cash when your order arrives. Please have the exact amount ready — our riders do not carry change. COD availability is confirmed at checkout based on your delivery location.",
    },
    "page_content_size_guide": {
        "unit_note": "All measurements are in inches. For the best fit, measure yourself and compare with the chart below.",
        "sizes": [
            {"size": "XS",  "chest": "32–34", "waist": "26–28", "hip": "35–37", "height": "155–160"},
            {"size": "S",   "chest": "35–37", "waist": "29–31", "hip": "38–40", "height": "160–165"},
            {"size": "M",   "chest": "38–40", "waist": "32–34", "hip": "41–43", "height": "165–170"},
            {"size": "L",   "chest": "41–43", "waist": "35–37", "hip": "44–46", "height": "170–175"},
            {"size": "XL",  "chest": "44–46", "waist": "38–40", "hip": "47–49", "height": "175–180"},
            {"size": "2XL", "chest": "47–49", "waist": "41–43", "hip": "50–52", "height": "180–185"},
            {"size": "3XL", "chest": "50–52", "waist": "44–46", "hip": "53–55", "height": "185–190"},
        ],
        "tips": [
            {"label": "Chest", "text": "Measure around the fullest part of your chest"},
            {"label": "Waist", "text": "Measure around your natural waistline"},
            {"label": "Hip",   "text": "Measure around the fullest part of your hips"},
        ],
        "tip_note": "When between sizes, we recommend sizing up for a relaxed fit or sizing down for a fitted look.",
    },

    # ── Product Options ───────────────────────────────────────────────────────────────────
    "available_sizes": ["XS", "S", "M", "L", "XL", "XXL"],
    "available_colors": [
        {"name": "Black",        "hex": "#000000"},
        {"name": "White",        "hex": "#FFFFFF"},
        {"name": "Navy Blue",    "hex": "#1E3A5F"},
        {"name": "Maroon",       "hex": "#782121"},
        {"name": "Grey",         "hex": "#9CA3AF"},
        {"name": "Olive Green",  "hex": "#556B2F"},
        {"name": "Burgundy",     "hex": "#800020"},
        {"name": "Camel",        "hex": "#C19A6B"},
        {"name": "Forest Green", "hex": "#228B22"},
        {"name": "Royal Blue",   "hex": "#4169E1"},
        {"name": "Cream",        "hex": "#FFFDD0"},
        {"name": "Brown",        "hex": "#8B4513"},
    ],
}


from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.user import User
