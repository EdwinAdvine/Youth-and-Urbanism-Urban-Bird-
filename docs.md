# Urban Bird — Platform Documentation

> **Urban Bird** is a Kenya-based e-commerce platform for urban streetwear and apparel. This document covers the full architecture, API reference, data models, flows, and deployment guide for developers maintaining or extending the platform.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Environment Variables](#3-environment-variables)
4. [Architecture Overview](#4-architecture-overview)
5. [Database Models](#5-database-models)
6. [API Reference](#6-api-reference)
7. [Authentication Flow](#7-authentication-flow)
8. [Payment Flows](#8-payment-flows)
9. [Order Lifecycle](#9-order-lifecycle)
10. [Guest Checkout Flow](#10-guest-checkout-flow)
11. [Stock Management](#11-stock-management)
12. [Notification System](#12-notification-system)
13. [Email & SMS](#13-email--sms)
14. [Admin Panel](#14-admin-panel)
15. [Scheduled Jobs](#15-scheduled-jobs)
16. [Security](#16-security)
17. [Frontend State Management](#17-frontend-state-management)
18. [Deployment Guide](#18-deployment-guide)
19. [Development Setup](#19-development-setup)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| **Backend framework** | FastAPI (async) |
| **ORM** | SQLAlchemy 2.0 (async) |
| **Database** | PostgreSQL (via asyncpg driver) |
| **Cache / sessions** | Redis (aioredis) |
| **Task scheduling** | APScheduler (async) |
| **Email** | aiosmtplib + Jinja2 templates |
| **SMS** | Africa's Talking |
| **Primary payment** | Paystack |
| **Aux payments** | M-Pesa STK Push, Stripe (code present, not enabled in UI) |
| **Image processing** | Pillow |
| **Rate limiting** | slowapi |
| **Frontend framework** | React 19 + TypeScript |
| **Build tool** | Vite |
| **State management** | Zustand |
| **HTTP client** | Axios |
| **Styling** | Tailwind CSS |
| **Routing** | React Router v6 |

---

## 2. Project Structure

```
URBAN BIRD/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app factory, middleware, route registration
│   │   ├── config.py            # Pydantic Settings — all env vars
│   │   ├── database.py          # SQLAlchemy async engine + session factory
│   │   ├── redis.py             # Redis connection pool
│   │   ├── limiter.py           # Rate limiting (slowapi)
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── deps.py      # FastAPI dependencies (auth guards)
│   │   │       ├── auth.py      # Register, login, logout, refresh, password reset
│   │   │       ├── products.py  # Product listing, detail, reviews
│   │   │       ├── categories.py
│   │   │       ├── cart.py
│   │   │       ├── wishlist.py
│   │   │       ├── orders.py    # Checkout, order history, return requests
│   │   │       ├── payments.py  # Paystack, M-Pesa, Stripe endpoints
│   │   │       ├── coupons.py
│   │   │       ├── shipping.py
│   │   │       ├── search.py
│   │   │       ├── newsletter.py
│   │   │       ├── notifications.py
│   │   │       ├── users.py             # User profile and address management
│   │   │       ├── content.py           # Public read endpoint for FAQ, privacy, terms, shipping, size-guide
│   │   │       └── admin/
│   │   │           ├── dashboard.py
│   │   │           ├── admin_orders.py
│   │   │           ├── admin_products.py
│   │   │           ├── admin_categories.py
│   │   │           ├── admin_customers.py
│   │   │           ├── admin_inventory.py
│   │   │           ├── admin_coupons.py
│   │   │           ├── admin_delivery.py
│   │   │           ├── admin_returns.py
│   │   │           ├── admin_staff.py
│   │   │           ├── admin_settings.py
│   │   │           ├── admin_banners.py
│   │   │           ├── admin_notifications.py
│   │   │           ├── admin_content.py # Content page management (FAQ, Privacy, Terms, Shipping, Size Guide)
│   │   │           └── admin_reports.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── product.py       # Category, Subcategory, Product, Variant, Image, Review
│   │   │   ├── order.py         # Order, OrderItem, OrderStatusHistory
│   │   │   ├── payment.py
│   │   │   ├── cart.py          # Cart, CartItem
│   │   │   ├── coupon.py        # Coupon, CouponUsage
│   │   │   ├── wishlist.py      # Wishlist, WishlistItem
│   │   │   ├── notification.py
│   │   │   ├── return_request.py
│   │   │   ├── shipping.py      # ShippingZone, ShippingRate
│   │   │   ├── newsletter.py
│   │   │   ├── audit_log.py
│   │   │   ├── site_settings.py # SiteSetting + DEFAULT_SETTINGS dict
│   │   │   └── banner.py
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── email_service.py
│   │   │   ├── notification_service.py
│   │   │   └── sms_service.py
│   │   ├── tasks/
│   │   │   └── scheduler.py     # APScheduler — thank-you email job
│   │   └── utils/
│   │       ├── security.py      # JWT, bcrypt helpers
│   │       ├── file_upload.py   # Image save + resize
│   │       ├── formatters.py    # format_ksh()
│   │       └── payments/
│   │           ├── paystack.py  # Paystack async client
│   │           └── mpesa_stk.py # M-Pesa STK push client
│   ├── .env                     # Secret environment variables (never commit)
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx              # Root component, auth init, cart/wishlist fetch
    │   ├── routes/
    │   │   └── index.tsx        # React Router route definitions
    │   ├── store/               # Zustand state stores
    │   │   ├── authStore.ts
    │   │   ├── cartStore.ts
    │   │   ├── wishlistStore.ts
    │   │   ├── orderStore.ts
    │   │   ├── checkoutStore.ts
    │   │   └── notificationStore.ts
    │   ├── services/            # Axios-based API clients
    │   │   ├── api.ts           # Axios instance + token refresh interceptor
    │   │   ├── authService.ts
    │   │   ├── cartService.ts
    │   │   ├── orderService.ts
    │   │   ├── notificationService.ts
    │   │   └── ...
    │   ├── pages/
    │   │   ├── HomePage.tsx
    │   │   ├── ShopPage.tsx
    │   │   ├── ProductDetailPage.tsx
    │   │   ├── CartPage.tsx
    │   │   ├── CheckoutPage.tsx
    │   │   ├── OrderConfirmationPage.tsx
    │   │   ├── account/
    │   │   └── admin/
    │   ├── components/
    │   │   ├── header/
    │   │   ├── layout/
    │   │   ├── product/
    │   │   └── ui/
    │   ├── types/
    │   │   └── index.ts         # All TypeScript interfaces
    │   └── hooks/
    │       ├── useAnalytics.ts
    │       ├── useRecentlyViewed.ts
    │       └── useSEO.ts
    ├── .env                     # VITE_API_URL, VITE_PAYSTACK_PUBLIC_KEY
    └── vite.config.ts
```

---

## 3. Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `ENVIRONMENT` | Yes | `development` or `production` |
| `FRONTEND_URL` | Yes | Full URL of the frontend (e.g. `https://urbanbird.co.ke`) |
| `BACKEND_URL` | Yes | Full URL of the backend API |
| `POSTGRES_USER` | Yes | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `POSTGRES_DB` | Yes | PostgreSQL database name |
| `POSTGRES_HOST` | Yes | PostgreSQL host (e.g. `postgres` in Docker) |
| `POSTGRES_PORT` | No | Defaults to `5432` |
| `REDIS_PASSWORD` | Yes | Redis auth password |
| `REDIS_HOST` | Yes | Redis host (e.g. `redis` in Docker) |
| `REDIS_PORT` | No | Defaults to `6379` |
| `JWT_SECRET_KEY` | Yes | Random string, minimum 32 characters |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Defaults to `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | Defaults to `7` |
| `PAYSTACK_SECRET_KEY` | Yes | Paystack secret key (live or test) |
| `PAYSTACK_PUBLIC_KEY` | Yes | Paystack public key |
| `PAYSTACK_WEBHOOK_SECRET` | Yes | Paystack webhook signing secret |
| `MPESA_CONSUMER_KEY` | No | Safaricom Daraja consumer key |
| `MPESA_CONSUMER_SECRET` | No | Safaricom Daraja consumer secret |
| `MPESA_SHORTCODE` | No | M-Pesa business shortcode |
| `MPESA_PASSKEY` | No | M-Pesa Lipa na M-Pesa passkey |
| `STRIPE_SECRET_KEY` | No | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `SMTP_HOST` | Yes | SMTP server (default: `smtp.office365.com`) |
| `SMTP_PORT` | No | Defaults to `587` |
| `SMTP_USER` | Yes | SMTP username / sender email |
| `SMTP_PASSWORD` | Yes | SMTP password |
| `ADMIN_EMAIL` | Yes | Primary admin email for notifications |
| `AT_USERNAME` | No | Africa's Talking username (SMS) |
| `AT_API_KEY` | No | Africa's Talking API key |
| `UPLOAD_DIR` | No | Defaults to `/app/uploads` |
| `MAX_IMAGE_SIZE_MB` | No | Defaults to `5` |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend API base URL |
| `VITE_PAYSTACK_PUBLIC_KEY` | Yes | Paystack public key (used in checkout) |

---

## 4. Architecture Overview

```
Browser / Mobile
      │
      ▼
  React 19 SPA  ─── Axios ──►  FastAPI (Python)
  (Vite build)                  │
  Zustand state                 ├── PostgreSQL  (data persistence)
  Tailwind CSS                  ├── Redis       (JWT refresh tokens, caching)
                                ├── APScheduler (background jobs)
                                ├── Paystack    (primary payment gateway)
                                ├── M-Pesa      (STK Push)
                                ├── aiosmtplib  (transactional email)
                                └── Africa's Talking (SMS)
```

### Middleware Stack (applied in order)

1. **SecurityHeadersMiddleware** — adds `X-Frame-Options`, CSP, HSTS (production only), etc.
2. **ImageCacheMiddleware** — sets `Cache-Control: immutable` on `/uploads/*` responses
3. **NoCacheAPIMiddleware** — sets `Cache-Control: no-store` on all `/api/*` responses
4. **CORSMiddleware** — restricts origins to `FRONTEND_URL` (+ localhost in dev)
5. **slowapi rate limiter** — applied per-route via `@limiter.limit()`

---

## 5. Database Models

### User

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `email` | String (unique) | |
| `phone` | String (unique, nullable) | |
| `password_hash` | String | bcrypt |
| `role` | String | `customer`, `admin`, `super_admin` |
| `first_name`, `last_name` | String | |
| `gender` | String | nullable |
| `avatar_url` | String | nullable |
| `is_active` | Boolean | default True |
| `is_verified` | Boolean | default False |
| `email_verified_at` | DateTime | nullable |
| `last_login` | DateTime | nullable |
| `profile_data` | JSON | extensible extra fields |

Relationships: `addresses` (1-to-many), `cart` (1-to-1), `wishlist` (1-to-1), `orders`, `reviews`, `payments`

---

### Product

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | String | |
| `slug` | String (unique) | URL-safe identifier |
| `description` | Text | |
| `price` | Decimal(10,2) | current selling price |
| `compare_at_price` | Decimal | original/strikethrough price |
| `cost_price` | Decimal | internal cost (hidden from customers) |
| `status` | String | `draft` or `active` |
| `is_featured` | Boolean | |
| `is_new_arrival` | Boolean | |
| `is_on_sale` | Boolean | |
| `total_stock` | Integer | denormalized sum of all variant stocks |
| `low_stock_threshold` | Integer | alert threshold, default 5 |
| `average_rating` | Float | denormalized, updated on review |
| `review_count` | Integer | denormalized |
| `purchase_count` | Integer | denormalized (incremented on payment) |
| `view_count` | Integer | incremented on product page views |
| `sku_prefix` | String | prefix for variant SKUs |
| `seo_title`, `seo_description`, `seo_keywords` | String | SEO metadata |

Related models: **ProductVariant**, **ProductImage**, **ProductReview**, **InventoryLog**

#### ProductVariant

| Column | Type | Notes |
|---|---|---|
| `sku` | String (unique) | |
| `size` | String | nullable |
| `color_name`, `color_hex` | String | nullable |
| `stock_quantity` | Integer | actual available stock |
| `reserved_quantity` | Integer | held for pending_payment orders |
| `price_adjustment` | Decimal | added to Product.price for this variant |
| `weight` | Float | grams |
| `barcode` | String | nullable |

---

### Order

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `order_number` | String (unique) | format: `UB-YYYYMMDD-XXXXX` |
| `user_id` | UUID FK (nullable) | NULL for guest orders |
| `guest_email` | String | nullable, for guest orders |
| `guest_token` | UUID | nullable, issued at checkout for secure guest access |
| `status` | String | see Order Lifecycle |
| `subtotal` | Decimal | sum of item prices |
| `discount_amount` | Decimal | coupon discount applied |
| `coupon_code` | String | nullable, the applied coupon code |
| `shipping_cost` | Decimal | |
| `tax_amount` | Decimal | currently always 0 |
| `total` | Decimal | `subtotal + shipping - discount + tax` |
| `shipping_full_name`, `shipping_phone` | String | snapshot at checkout |
| `shipping_address_1`, `shipping_address_2` | String | |
| `shipping_city`, `shipping_county` | String | |
| `shipping_method` | String | e.g. `standard`, `express` |
| `tracking_number` | String | nullable, set by admin |
| `carrier` | String | nullable |
| `estimated_delivery` | Date | nullable |
| `delivered_at` | DateTime | nullable |
| `payment_method` | String | `paystack`, `mpesa`, `cod` |
| `payment_status` | String | `pending`, `paid`, `failed` |
| `customer_notes` | Text | nullable, entered during checkout |
| `thank_you_email_sent` | Boolean | scheduler flag |

#### OrderItem (immutable snapshot)

Stores `product_name`, `variant_sku`, `size`, `color_name`, `product_image`, `quantity`, `unit_price`, `total_price` at the moment of purchase. Product/variant FKs are nullable with SET NULL on delete — historical items survive product deletions.

#### OrderStatusHistory

Tracks every `old_status → new_status` transition with `changed_by` (admin UUID), and optional `note`. Provides a full audit trail visible to both customers and admins.

---

### Payment

| Column | Type | Notes |
|---|---|---|
| `gateway` | String | `paystack`, `mpesa`, `stripe`, `cod` |
| `amount` | Decimal | in KES |
| `currency` | String | always `KES` |
| `status` | String | `pending`, `completed`, `failed`, `cod_pending` |
| `gateway_transaction_id` | String | nullable |
| `gateway_response` | JSON | raw gateway response for debugging |
| `mpesa_checkout_request_id` | String | M-Pesa STK request ID |
| `mpesa_phone` | String | customer phone used for STK |
| `mpesa_receipt_number` | String | M-Pesa confirmation code |
| `stripe_payment_intent_id` | String | Stripe payment intent |
| `refund_amount` | Decimal | nullable |
| `refunded_at` | DateTime | nullable |

---

### Cart

Session-based: identified either by `user_id` (authenticated) or `session_id` (cookie, for guests). Each cart has zero or more `CartItem` rows, each linked to a specific `ProductVariant`. An optional `coupon_id` FK links the active coupon.

---

### Coupon

| Column | Type | Notes |
|---|---|---|
| `code` | String (unique) | uppercase, used for lookup |
| `discount_type` | String | `percentage` or `fixed` |
| `discount_value` | Decimal | % or fixed KES amount |
| `min_order_amount` | Decimal | nullable minimum order threshold |
| `max_discount_amount` | Decimal | nullable cap for percentage coupons |
| `usage_limit` | Integer | nullable, total redemptions allowed |
| `per_user_limit` | Integer | nullable, per-customer cap |
| `times_used` | Integer | incremented on each use |
| `starts_at`, `expires_at` | DateTime | nullable date range |
| `applicable_categories` | JSON | nullable list of category IDs |

`CouponUsage` records which user used which coupon on which order.

---

### Notification

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID FK (nullable) | `NULL` = admin notification |
| `type` | String | e.g. `order_placed`, `new_order`, `low_stock`, `return` |
| `title` | String | |
| `message` | String | |
| `data` | JSON | extra metadata (order_number, links, etc.) |
| `is_read` | Boolean | default False |
| `created_at` | DateTime | indexed |

**Convention:** `user_id IS NULL` means the notification belongs to admin. Customer notifications have a valid `user_id`.

---

### SiteSetting

Flat key-value store with JSON values. Keys are defined in `DEFAULT_SETTINGS` in `models/site_settings.py` and auto-seeded on startup. Current keys include:

- `store_name`, `logo_url`
- `whatsapp_number`
- `announcement_messages` (list)
- `social_links` (object)
- `paystack_public_key`, `smtp_*`, `sms_*`
- `available_sizes`, `available_colors`

Admins can update these via `PATCH /api/v1/admin/settings/{key}`.

---

## 6. API Reference

All endpoints are prefixed with `/api/v1`.

### Authentication — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Create account, returns JWT pair |
| POST | `/auth/login` | None | Login, returns JWT pair |
| POST | `/auth/logout` | Bearer | Invalidate refresh token |
| POST | `/auth/refresh` | httpOnly cookie | Get new access token |
| POST | `/auth/forgot-password` | None | Send password reset email |
| POST | `/auth/reset-password` | None | Apply new password using reset token |
| POST | `/auth/change-password` | Bearer | Change password (authenticated) |

### Products — `/products`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/products` | None | List products with filters/sorting/pagination |
| GET | `/products/{slug}` | None | Product detail with variants, images, reviews |
| GET | `/products/{slug}/reviews` | None | Paginated product reviews |
| POST | `/products/{slug}/reviews` | Bearer | Submit a review (one per product per user) |

**Supported query params for listing:**
`category`, `subcategory`, `min_price`, `max_price`, `sizes` (comma-sep), `colors`, `in_stock`, `on_sale`, `search`, `sort` (`latest|popularity|rating|price_asc|price_desc|name`), `page`, `limit`

### Cart — `/cart`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/cart` | Optional | Get current cart (user or session) |
| POST | `/cart/items` | Optional | Add item by `variant_id` |
| PATCH | `/cart/items/{item_id}` | Optional | Update quantity |
| DELETE | `/cart/items/{item_id}` | Optional | Remove item |
| DELETE | `/cart` | Optional | Clear entire cart |
| POST | `/cart/merge` | Bearer | Merge guest cart into authenticated user cart |

The cart session for guests is tracked via the `cart_session` httpOnly cookie, set automatically by the backend on first add.

### Orders — `/orders`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/orders/checkout` | Optional | Create order from cart |
| GET | `/orders` | Bearer | List user's orders |
| GET | `/orders/{order_number}` | Optional | Get order (auth or guest token) |
| POST | `/orders/{order_number}/cancel` | Bearer | Cancel `pending_payment` or `confirmed` order |
| POST | `/orders/{order_number}/return` | Bearer | Submit return request |
| GET | `/orders/{order_number}/returns` | Bearer | List return requests for order |
| GET | `/orders/track` | None | Public tracking by order_number + email |

**CheckoutRequest body:**
```json
{
  "shipping_full_name": "Jane Doe",
  "shipping_phone": "0712345678",
  "shipping_address_line_1": "123 Westlands Ave",
  "shipping_address_line_2": "Apt 4",
  "shipping_city": "Nairobi",
  "shipping_county": "Nairobi",
  "payment_method": "paystack",
  "shipping_rate_id": "uuid-optional",
  "coupon_code": "SAVE10",
  "customer_notes": "Leave at gate",
  "guest_email": "guest@example.com"
}
```

### Payments — `/payments`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/paystack/initialize` | Optional | Start Paystack transaction |
| GET | `/payments/paystack/verify/{reference}` | Optional | Verify Paystack after redirect |
| POST | `/payments/paystack/webhook` | None (HMAC signed) | Paystack server callback |
| POST | `/payments/paystack/retry/{order_number}` | Optional | Retry failed Paystack payment |
| POST | `/payments/mpesa/initiate` | Bearer | Trigger M-Pesa STK Push |
| POST | `/payments/mpesa/callback` | None (IP-filtered) | Safaricom callback |
| GET | `/payments/mpesa/status/{checkout_request_id}` | Bearer | Poll M-Pesa status |
| POST | `/payments/stripe/create-intent` | Bearer | Create Stripe PaymentIntent |
| POST | `/payments/stripe/webhook` | None (signed) | Stripe server callback |

### Notifications — `/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | Bearer | List customer notifications (paginated) |
| GET | `/notifications/unread-count` | Bearer | Unread count badge |
| PATCH | `/notifications/{id}/read` | Bearer | Mark single as read |
| POST | `/notifications/read-all` | Bearer | Mark all as read |

### Admin — `/admin/*`

All admin routes require a valid JWT with `role = admin` or `super_admin`.

| Prefix | Description |
|---|---|
| `/admin/dashboard` | Metrics, recent orders/customers |
| `/admin/orders` | List, view, update status, delete orders |
| `/admin/products` | CRUD, image upload, variant management |
| `/admin/categories` | Category and subcategory management |
| `/admin/customers` | Customer list and detail |
| `/admin/inventory` | Stock levels, adjustments, low-stock report |
| `/admin/coupons` | Coupon CRUD |
| `/admin/delivery` | Shipping zones and rates |
| `/admin/returns` | Return request management |
| `/admin/staff` | Staff account management |
| `/admin/settings` | Site settings (logo, WhatsApp, announcements, etc.) |
| `/admin/banners` | Homepage banners |
| `/admin/notifications` | Admin notification inbox |
| `/admin/reports` | Revenue, sales, customer reports |

---

## 7. Authentication Flow

### Token Strategy

- **Access token**: Short-lived JWT (30 min), stored **in memory only** on the frontend (never localStorage). Attached as `Authorization: Bearer <token>` header.
- **Refresh token**: Long-lived JWT (7 days), stored in an **httpOnly cookie** (not accessible to JavaScript). Used to silently obtain new access tokens.
- **JTI tracking**: Each refresh token's `jti` (JWT ID) is stored in Redis. On logout, the `jti` is deleted from Redis, immediately invalidating the refresh token.

### Registration / Login

```
Client                      Server
  │── POST /auth/register ──►│  Hash password (bcrypt)
  │                          │  Create User record
  │                          │  Generate access_token + refresh_token
  │◄── { access_token } ─────│  Set refresh_token in httpOnly cookie
  │                          │  Send welcome email (async)
```

### Token Refresh (automatic, via Axios interceptor)

```
Client                      Server
  │── [any API request] ────►│  Returns 401 (access token expired)
  │── POST /auth/refresh ────►│  Reads httpOnly cookie
  │                          │  Validates refresh JTI in Redis
  │◄── { access_token } ─────│  Issues new access token
  │── [retry original req] ──►│
```

If the refresh also fails (e.g. cookie expired), the frontend redirects to `/account/login` (or `/admin/login` for admin routes). All in-flight requests during the refresh are queued and retried automatically once the new token arrives.

### Password Reset

```
POST /auth/forgot-password  →  Generates reset token (UUID), stores in Redis with 1h TTL
                            →  Sends reset link via email
POST /auth/reset-password   →  Validates token from Redis
                            →  Updates password hash
                            →  Deletes token from Redis
```

---

## 8. Payment Flows

### Paystack (Primary)

```
Checkout Page
  │
  ▼
POST /orders/checkout          → Order created (status=pending_payment)
                                 Stock reserved (variant.reserved_quantity += qty)
  │
  ▼
POST /payments/paystack/initialize
  │                            → Calls Paystack API with order total + email
  │                            → Returns authorization_url
  ▼
Redirect to Paystack hosted page
  │
  ▼ (customer completes payment)
Redirect to /order-confirmation/{order_number}?reference=xxx
  │
  ▼
GET /payments/paystack/verify/{reference}
  │                            → Calls Paystack verify API
  │                            → On success:
  │                               - Payment.status = "completed"
  │                               - Order.status   = "confirmed"
  │                               - Order.payment_status = "paid"
  │                               - Stock finalized (reserved → actual sale)
  │                               - Confirmation email + SMS sent (async)
  ▼
Order Confirmation Page shown

   ┌─ PARALLEL ─────────────────────────────────────────────────────┐
   │ POST /payments/paystack/webhook                                 │
   │ (Paystack server-to-server callback, HMAC-SHA512 verified)      │
   │ → Same state update as verify, using SELECT FOR UPDATE to       │
   │   prevent double-processing if both fire simultaneously         │
   └────────────────────────────────────────────────────────────────┘
```

**Idempotency**: Both the frontend verify endpoint and the webhook use `SELECT FOR UPDATE` and check `order.payment_status != "paid"` before updating — the first one to arrive wins; the second is a no-op.

### Cash on Delivery (COD)

- Order is immediately moved to `confirmed` status at checkout.
- Stock is decremented immediately (no reservation phase).
- Confirmation email + SMS sent at checkout.
- Payment.status = `cod_pending` until delivery.

### M-Pesa (Available but not surfaced in default UI)

```
POST /payments/mpesa/initiate  → STK Push sent to customer's phone
Customer enters PIN on phone
POST /payments/mpesa/callback  → Safaricom fires callback
                                 IP-restricted to Safaricom ranges in production
                                 Updates Payment + Order on success
```

### Stripe (Code present, not enabled in UI by default)

Standard PaymentIntent flow via webhook for server-side confirmation.

---

## 9. Order Lifecycle

### Status Transitions

```
pending_payment → confirmed → processing → shipped → out_for_delivery → delivered
       │               │
       └──────►  cancelled  (customer or admin)
                     │
               refunded / returned  (admin initiated)
```

**Rules:**
- Only forward transitions are allowed by the admin panel (e.g. cannot move from `delivered` back to `shipped`).
- Customers can cancel orders in `pending_payment` or `confirmed` status only.
- When an order is cancelled or deleted by admin, `reserved_quantity` and `stock_quantity` are restored.

### Admin Status Update Actions

When an admin updates an order to `shipped`, the system automatically:
1. Saves the `tracking_number` and `carrier` to the order.
2. Sends a shipping notification email to the customer.
3. Sends a shipping notification SMS.
4. Creates an in-platform notification for the customer.

When an order reaches `delivered`:
1. `delivered_at` timestamp is recorded.
2. The thank-you email scheduler (every 30 min) picks it up 12 hours later.

---

## 10. Guest Checkout Flow

Guests can place orders without creating an account.

```
1. Guest adds items to cart
   → Backend sets cart_session cookie (UUID, httpOnly)
   → Cart stored in DB with session_id instead of user_id

2. Guest fills checkout form
   → Provides guest_email in CheckoutRequest body
   → Backend creates order with guest_email + guest_token (UUID)

3. Backend returns order with guest_token in response
   → Frontend stores { guest_email, guest_token } in sessionStorage

4. Guest is redirected to /order-confirmation/{order_number}?reference=xxx
   → OrderConfirmationPage reads guest credentials from sessionStorage
   → Attaches ?guest_email=...&guest_token=... to order detail request

5. Guest can also track order via:
   GET /orders/{order_number}?guest_email=...&guest_token=...
   GET /orders/track?order_number=...&email=...
```

The `guest_token` is a security measure: it prevents anyone who knows only the order number from viewing order details.

---

## 11. Stock Management

### Two-phase stock model

| Phase | Trigger | Effect |
|---|---|---|
| **Reserve** | Checkout (online payment) | `variant.reserved_quantity += qty` |
| **Finalize** | Payment confirmed | `variant.stock_quantity -= qty` + `variant.reserved_quantity -= qty` |
| **Release** | Payment failed | `variant.reserved_quantity -= qty` (stock_quantity unchanged) |
| **Immediate deduct** | COD checkout | `variant.stock_quantity -= qty` directly (no reservation) |
| **Restore** | Order cancelled / deleted | `variant.stock_quantity += qty` + `variant.reserved_quantity -= qty` |

### Low-stock alerts

When `variant.stock_quantity <= product.low_stock_threshold` (default: 5) after a sale:
- An alert email is sent to the admin (non-blocking `asyncio.create_task`).
- The admin can adjust thresholds per product in the inventory panel.

### `product.total_stock`

A denormalized field that mirrors the sum of all variant stocks. Kept in sync at every stock change point. This allows fast filtering (`in_stock=true`) without a subquery.

---

## 12. Notification System

The platform has two notification channels per audience:

### In-Platform Notifications (DB-backed)

| Audience | `user_id` value | Endpoint |
|---|---|---|
| Customer | `<user_uuid>` | `GET /api/v1/notifications` |
| Admin | `NULL` | `GET /api/v1/admin/notifications` |

Notifications are created by calling `create_notification()` or `create_admin_notification()` from `services/notification_service.py`. This is done inside route handlers and scheduled jobs, not as background tasks, so they are committed in the same DB transaction.

### When notifications are created

| Event | Customer | Admin |
|---|---|---|
| Order placed | ✅ "Order Placed — UB-..." | ✅ "New Order — UB-..." |
| Order shipped | ✅ "Your order has shipped" | — |
| Order delivered | ✅ "Thank you for your order" (scheduler) | — |
| Return submitted | ✅ "Return Request Submitted" | ✅ "New Return Request" |
| Low stock | — | ✅ "Low Stock Alert: SKU..." |

---

## 13. Email & SMS

### Email Service (`services/email_service.py`)

All emails use **Jinja2 HTML templates** rendered server-side and sent via **aiosmtplib** (async SMTP). Emails are dispatched as non-blocking tasks using `asyncio.create_task()` so they never delay the API response.

| Function | Trigger |
|---|---|
| `send_welcome_email` | User registers |
| `send_order_confirmation` | Order paid (Paystack/M-Pesa) or COD checkout |
| `send_admin_new_order` | Same as above, sent to all admin users |
| `send_shipping_notification` | Admin marks order as `shipped` |
| `send_delivery_thankyou` | Scheduler, 12h after `delivered` |
| `send_low_stock_alert` | Stock crosses threshold |
| `send_return_submitted` | Customer submits return |
| `send_admin_new_return` | Same as above, sent to admin |

**Activation:** Email sending is only active when `SMTP_USER` and `SMTP_PASSWORD` are set in the environment. Otherwise calls are silently ignored.

### SMS Service (`services/sms_service.py`)

Uses **Africa's Talking** API. Sender ID: `URBANBIRD`.

| Function | Trigger |
|---|---|
| `send_order_confirmation_sms` | Order confirmed |
| `send_shipping_notification_sms` | Order marked `shipped` |

**Activation:** SMS is only active when `AT_API_KEY` is configured. Sandbox mode is used if `AT_USERNAME = sandbox`.

---

## 14. Admin Panel

The admin panel is a React SPA accessible at `/admin/*`. Admin users must have `role = admin` or `role = super_admin`.

### Key Pages

| Route | Description |
|---|---|
| `/admin/dashboard` | Revenue, order count, customer count, recent activity |
| `/admin/orders` | Filter by status/payment, search, bulk actions |
| `/admin/orders/{id}` | Full order view, status update with optional note |
| `/admin/products` | Product list, create/edit/delete |
| `/admin/products/new` | Product form (details, pricing, variants, images, SEO) |
| `/admin/inventory` | Stock levels by variant, adjust stock |
| `/admin/customers` | Customer list and profiles |
| `/admin/coupons` | Create/manage discount coupons |
| `/admin/delivery` | Shipping zones and rates |
| `/admin/returns` | Review and resolve return requests |
| `/admin/staff` | Admin user management |
| `/admin/settings` | Site settings (live edits, no redeploy needed) |
| `/admin/banners` | Homepage banner images |
| `/admin/notifications` | In-platform admin notification inbox |
| `/admin/reports` | Revenue and sales analytics |
| `/admin/content/:page` | Edit FAQ, Privacy Policy, Terms, Shipping Info, Size Guide content |

### Content Page Management

Admins can edit the displayed content for public info pages (FAQ, Privacy Policy, Terms, Shipping Info, Size Guide) via `/admin/content/:page`. Content is stored in the `site_settings` table using keys `page_content_faq`, `page_content_privacy`, `page_content_terms`, `page_content_shipping`, `page_content_size_guide`. Changes take effect immediately without a redeploy. The public endpoint `GET /api/v1/content/{page}` serves the stored content, falling back to hardcoded defaults if no custom content has been saved yet.

| Page | URL | API key |
|------|-----|---------|
| FAQ | `/faq` | `page_content_faq` |
| Privacy Policy | `/privacy` | `page_content_privacy` |
| Terms & Conditions | `/terms` | `page_content_terms` |
| Shipping Info | `/shipping` | `page_content_shipping` |
| Size Guide | `/size-guide` | `page_content_size_guide` |

### Audit Logging

Every admin mutation (create, update, delete) on orders, products, categories, coupons, and customers is recorded in the `AuditLog` table with:
- `admin_id` — who made the change
- `action` — `create`, `update`, `delete`
- `entity_type`, `entity_id` — what was changed
- `old_value`, `new_value` — JSON snapshots before/after

---

## 15. Scheduled Jobs

Managed by **APScheduler** (AsyncIOScheduler) with timezone `Africa/Nairobi`.

The scheduler starts during FastAPI's lifespan startup and stops cleanly on shutdown.

### Thank-you Email Job

- **Schedule:** Every 30 minutes
- **Logic:**
  1. Query all orders where `status = "delivered"` AND `thank_you_email_sent = False` AND `delivered_at <= NOW() - 12 hours`
  2. For each order, send `send_delivery_thankyou()` email
  3. Create a customer in-platform notification
  4. Set `order.thank_you_email_sent = True`

---

## 16. Security

### API Security

| Mechanism | Details |
|---|---|
| **JWT access tokens** | 30-min expiry, in-memory only (XSS-safe) |
| **Refresh tokens** | httpOnly cookie (XSS-safe), 7-day expiry, JTI tracked in Redis |
| **bcrypt password hashing** | All passwords hashed before storage |
| **Rate limiting** | Via slowapi on auth (login: 5/min, forgot-password: 3/min), checkout (10/min), and order tracking (10/min) endpoints |
| **CORS** | Restricted to `FRONTEND_URL` (+ localhost in dev) |
| **Webhook HMAC** | Paystack webhooks verified via SHA-512 HMAC |
| **M-Pesa IP filter** | Callbacks restricted to Safaricom IP ranges in production |
| **Guest token** | UUID issued at checkout; required for guest order access |

### HTTP Security Headers

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Content-Security-Policy` | Allows `self` + `js.paystack.co` + `api.paystack.co` |
| `Strict-Transport-Security` | Set in production only (`max-age=31536000`) |
| `Permissions-Policy` | Denies geolocation, microphone, camera |

### Docs URL

Swagger UI (`/docs`) and ReDoc (`/redoc`) are **disabled in production** (`ENVIRONMENT=production`). They are available in development.

---

## 17. Frontend State Management

All global state is managed with **Zustand** stores. No Redux.

| Store | Key state | Key actions |
|---|---|---|
| `authStore` | `user`, `isAuthenticated`, `isInitialized` | `initialize()`, `login()`, `logout()`, `register()` |
| `cartStore` | `cart`, `isLoading` | `fetchCart()`, `addItem()`, `updateItem()`, `removeItem()` |
| `wishlistStore` | `items` | `fetchWishlist()`, `addItem()`, `removeItem()` |
| `orderStore` | `orders`, `currentOrder` | `fetchOrders()`, `fetchOrder()`, `cancelOrder()` |
| `checkoutStore` | `step`, `shippingData`, `paymentMethod` | `setStep()`, `setShippingData()`, `setCoupon()`, `resetCheckout()` |
| `notificationStore` | `notifications`, `unreadCount`, `adminNotifications`, `adminUnreadCount` | `fetchNotifications()`, `markRead()`, `fetchAdminNotifications()` |

### Axios Instance (`services/api.ts`)

A single Axios instance with:
- `withCredentials: true` — sends httpOnly cookies on every request
- **Request interceptor:** Attaches in-memory access token as `Authorization: Bearer`
- **Response interceptor:** On 401, attempts silent token refresh and queues all concurrent in-flight requests. On refresh success, retries all queued requests. On refresh failure, redirects to login.

---

## 18. Deployment Guide

The platform is deployed on **Coolify** (self-hosted PaaS) using Docker Compose.

### Startup Sequence (automatic on deploy)

1. SQLAlchemy creates any missing DB tables (`Base.metadata.create_all`)
2. `_seed_default_settings()` inserts any new `DEFAULT_SETTINGS` keys without overwriting existing data
3. `_patch_stale_settings()` applies one-time data patches (e.g. WhatsApp number corrections)
4. Redis content cache is flushed — ensures every deploy serves fresh product/category data immediately without manual cache invalidation
5. APScheduler starts

### Caching Strategy

| Content | Cache policy |
|---|---|
| `/uploads/*` images | `Cache-Control: public, max-age=31536000, immutable` (1 year, UUID filenames never change) |
| `/api/*` responses | `Cache-Control: no-store` (always fresh) |
| Redis content keys | Flushed on every startup (patterns: `product:*`, `category:*`, `search:*`, `settings:*`, `banner:*`) |
| Redis auth keys | **Never flushed** (patterns: `refresh:*`, `blacklist:*`, `pwd_reset:*`) |

### Gunicorn / Multi-worker Safety

The `create_all` call is wrapped in a try/except to handle the race condition where multiple Gunicorn workers attempt to create tables simultaneously. The second worker simply ignores the error and continues.

---

## 19. Development Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and fill environment file
cp .env.example .env

# Start PostgreSQL and Redis via Docker
docker compose up -d postgres redis

# Run the development server
uvicorn app.main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and fill environment file
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

App available at: `http://localhost:5173`

### Generating a JWT Secret Key

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Running with Docker Compose (full stack)

```bash
docker compose up --build
```

---

## Appendix: Key Conventions

| Convention | Detail |
|---|---|
| Order lookup | Always by `order_number` (e.g. `UB-20260315-12345`), never by UUID in URLs |
| Order number format | `UB-{YYYYMMDD}-{5-digit-random}` |
| Currency | Always KES. Stored as `Decimal(10,2)`. Formatted via `format_ksh()` |
| Image storage | Uploaded to `UPLOAD_DIR` with UUID filenames. Served at `/uploads/{uuid}.jpg` |
| Admin notification | `Notification` with `user_id = NULL` |
| Guest cart | Identified by `cart_session` httpOnly cookie |
| Guest order access | Requires `guest_email` + `guest_token` query params |
| Stock finalization | Only happens after payment confirmation, not at checkout |
| Email/SMS dispatch | Always `asyncio.create_task()` — never blocks the API response |
| Audit logs | Every admin data mutation is recorded in `AuditLog` |
