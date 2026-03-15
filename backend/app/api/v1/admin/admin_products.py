from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from pathlib import Path
import uuid
import re
import json

from app.database import get_db
from app.models.product import Product, ProductVariant, ProductImage, Category, Subcategory, ProductReview
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.product import ProductCreate, ProductUpdate, VariantCreate, ProductDetail
from app.api.deps import get_admin_user
from app.utils.file_upload import save_product_image
from app.config import settings


def _json_safe(data: dict | None) -> dict | None:
    """Convert a dict to JSON-serializable form (converts UUID → str, Decimal → float, etc.)."""
    if data is None:
        return None
    return json.loads(json.dumps(data, default=str))


async def _log(
    db: AsyncSession,
    admin: User,
    action: str,
    entity_type: str = None,
    entity_id: str = None,
    old_value: dict = None,
    new_value: dict = None,
    description: str = None,
):
    db.add(AuditLog(
        admin_id=admin.id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=_json_safe(old_value),
        new_value=_json_safe(new_value),
        description=description,
    ))

router = APIRouter()


def _apply_colors(data: dict) -> dict:
    """If a multi-color array is provided, auto-fill color_name and color_hex from it."""
    colors = data.get("colors")
    if colors:
        data["color_name"] = " + ".join(c["name"] for c in colors)
        data["color_hex"] = colors[0]["hex"]
    return data


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text


@router.get("")
async def list_products(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    from sqlalchemy import func

    query = select(Product).options(
        selectinload(Product.images),
        selectinload(Product.category),
    ).order_by(Product.created_at.desc())

    if status:
        query = query.where(Product.status == status)
    if q:
        query = query.where(Product.name.ilike(f"%{q}%"))
    if category:
        query = query.join(Product.category).where(Category.slug == category)
    if subcategory:
        query = query.join(Product.subcategory).where(Subcategory.slug == subcategory)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    products = result.scalars().all()

    def get_primary_image(p: Product) -> Optional[str]:
        for img in p.images:
            if img.is_primary:
                return img.url
        return p.images[0].url if p.images else None

    items = [
        {
            "id": str(p.id),
            "name": p.name,
            "slug": p.slug,
            "price": float(p.price),
            "status": p.status,
            "total_stock": p.total_stock,
            "primary_image": get_primary_image(p),
            "category": {"name": p.category.name} if p.category else None,
            "created_at": p.created_at.isoformat(),
        }
        for p in products
    ]
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.post("", response_model=ProductDetail, status_code=201)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    slug = data.slug or slugify(data.name)

    # Ensure unique slug
    result = await db.execute(select(Product).where(Product.slug == slug))
    if result.scalar_one_or_none():
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"

    product_data = {k: v for k, v in data.model_dump().items() if k not in ("slug", "variants")}
    product = Product(**product_data, slug=slug)
    db.add(product)
    await db.flush()

    # Create inline variants if provided
    total_stock = 0
    for v in data.variants:
        variant = ProductVariant(product_id=product.id, **_apply_colors(v.model_dump()))
        db.add(variant)
        total_stock += v.stock_quantity
    if total_stock > 0:
        product.total_stock = total_stock
    await db.flush()

    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.variants),
                 selectinload(Product.category), selectinload(Product.subcategory))
        .where(Product.id == product.id)
    )
    created = result.scalar_one()
    await _log(db, admin, "create", "product", str(created.id), description=f"Created product: {data.name}")
    return created


@router.get("/{product_id}", response_model=ProductDetail)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.variants),
                 selectinload(Product.category), selectinload(Product.subcategory))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductDetail)
async def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = data.model_dump(exclude_unset=True)
    variants_data = update_data.pop("variants", None)

    for field, value in update_data.items():
        if value is not None:
            setattr(product, field, value)

    # Handle variants if provided
    if variants_data is not None:
        # Remove existing variants and replace
        existing = await db.execute(
            select(ProductVariant).where(ProductVariant.product_id == product_id)
        )
        for v in existing.scalars().all():
            await db.delete(v)
        await db.flush()

        total_stock = 0
        for v_data in variants_data:
            variant = ProductVariant(product_id=product_id, **_apply_colors(v_data))
            db.add(variant)
            total_stock += v_data.get("stock_quantity", 0)
        product.total_stock = total_stock

    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.variants),
                 selectinload(Product.category), selectinload(Product.subcategory))
        .where(Product.id == product_id)
    )
    updated = result.scalar_one()
    await _log(db, admin, "update", "product", str(product_id),
               new_value=update_data, description=f"Updated product: {updated.name}")
    return updated


@router.delete("/{product_id}", status_code=204)
async def archive_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.status = "archived"
    await _log(db, admin, "archive", "product", str(product_id), description=f"Archived product: {product.name}")


@router.post("/{product_id}/images", status_code=201)
async def upload_images(
    product_id: uuid.UUID,
    files: list[UploadFile] = File(None),
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Accept both 'file' (single) and 'files' (multiple)
    upload_files = []
    if files:
        upload_files.extend(files)
    if file:
        upload_files.append(file)
    if not upload_files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Check if this is first image (make it primary)
    img_count_result = await db.execute(
        select(ProductImage).where(ProductImage.product_id == product_id)
    )
    existing_count = len(img_count_result.scalars().all())

    uploaded = []
    for i, f in enumerate(upload_files[:8]):  # Max 8 images
        saved = await save_product_image(f, str(product_id))
        img = ProductImage(
            product_id=product_id,
            url=saved["url"],
            thumbnail_url=saved["thumbnail_url"],
            alt_text=product.name,
            display_order=existing_count + i,
            is_primary=(existing_count == 0 and i == 0),
        )
        db.add(img)
        uploaded.append({"url": saved["url"], "thumbnail_url": saved["thumbnail_url"]})

    return {"uploaded": uploaded}


@router.delete("/{product_id}/images/{image_id}", status_code=204)
async def delete_image(
    product_id: uuid.UUID,
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(ProductImage).where(
            ProductImage.id == image_id,
            ProductImage.product_id == product_id,
        )
    )
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    was_primary = img.is_primary

    # Delete files from disk
    # url is stored as "/uploads/products/{product_id}/xxx.webp"
    # upload_dir is "/app/uploads", so strip "/uploads" prefix and join to upload_dir
    for url in [img.url, img.thumbnail_url]:
        if url:
            relative = url[len("/uploads"):]  # e.g. "/products/{id}/xxx.webp"
            path = Path(settings.upload_dir) / relative.lstrip("/")
            path.unlink(missing_ok=True)

    await db.delete(img)
    await db.flush()

    # If deleted image was primary, promote the next remaining image
    if was_primary:
        remaining = await db.execute(
            select(ProductImage)
            .where(ProductImage.product_id == product_id)
            .order_by(ProductImage.display_order)
            .limit(1)
        )
        next_img = remaining.scalar_one_or_none()
        if next_img:
            next_img.is_primary = True


@router.post("/{product_id}/variants", status_code=201)
async def add_variant(
    product_id: uuid.UUID,
    data: VariantCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    variant = ProductVariant(product_id=product_id, **_apply_colors(data.model_dump()))
    db.add(variant)
    await db.flush()

    # Update product total stock
    product.total_stock += data.stock_quantity
    return variant


@router.patch("/{product_id}/variants/{variant_id}")
async def update_variant(
    product_id: uuid.UUID,
    variant_id: uuid.UUID,
    data: VariantCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(ProductVariant).where(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
        )
    )
    variant = result.scalar_one_or_none()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    updated_fields = _apply_colors(data.model_dump(exclude_unset=True))
    for field, value in updated_fields.items():
        setattr(variant, field, value)

    # Recalculate product total_stock when stock_quantity changes
    if "stock_quantity" in updated_fields:
        await db.flush()  # ensure the updated stock_quantity is visible to the SUM query
        result = await db.execute(
            select(func.sum(ProductVariant.stock_quantity)).where(
                ProductVariant.product_id == product_id
            )
        )
        product_result = await db.execute(
            select(Product).where(Product.id == product_id)
        )
        product = product_result.scalar_one_or_none()
        if product:
            product.total_stock = result.scalar() or 0

    return variant


# ─── Review Moderation ──────────────────────────────────────────────────────

@router.get("/reviews/pending")
async def list_pending_reviews(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """List all reviews awaiting moderation."""
    from sqlalchemy import func
    from sqlalchemy.orm import selectinload as _sload
    query = (
        select(ProductReview)
        .options(_sload(ProductReview.user), _sload(ProductReview.product))
        .where(ProductReview.is_approved == False)
        .order_by(ProductReview.created_at.desc())
    )
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    reviews = result.scalars().all()
    return {
        "total": total,
        "items": [
            {
                "id": str(r.id),
                "product_id": str(r.product_id),
                "product_name": r.product.name if r.product else None,
                "user_name": r.user.full_name if r.user else "Unknown",
                "rating": r.rating,
                "title": r.title,
                "body": r.body,
                "is_verified_purchase": r.is_verified_purchase,
                "created_at": r.created_at.isoformat(),
            }
            for r in reviews
        ],
    }


@router.patch("/reviews/{review_id}/approve", status_code=200)
async def approve_review(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Approve a product review so it becomes publicly visible."""
    result = await db.execute(
        select(ProductReview).where(ProductReview.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.is_approved:
        return {"message": "Review is already approved"}
    review.is_approved = True

    # Update product's denormalized rating stats
    prod_result = await db.execute(
        select(Product).where(Product.id == review.product_id)
    )
    product = prod_result.scalar_one_or_none()
    if product:
        approved_result = await db.execute(
            select(ProductReview).where(
                ProductReview.product_id == product.id,
                ProductReview.is_approved == True,
            )
        )
        approved = approved_result.scalars().all()
        if approved:
            product.review_count = len(approved)
            product.average_rating = sum(r.rating for r in approved) / len(approved)

    await _log(db, admin, "approve_review", "review", str(review_id),
               description=f"Approved review for product {review.product_id}")
    return {"message": "Review approved and is now publicly visible"}


@router.delete("/reviews/{review_id}", status_code=204)
async def delete_review(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Delete a product review."""
    result = await db.execute(
        select(ProductReview).where(ProductReview.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    await _log(db, admin, "delete_review", "review", str(review_id),
               description=f"Deleted review for product {review.product_id}")
    await db.delete(review)
