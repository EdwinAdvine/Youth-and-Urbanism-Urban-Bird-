from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional
import uuid
import re

from app.database import get_db
from app.models.product import Product, ProductVariant, ProductImage
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, VariantCreate, ProductDetail
from app.api.deps import get_admin_user
from app.utils.file_upload import save_product_image

router = APIRouter()


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
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = select(Product).options(
        selectinload(Product.images),
        selectinload(Product.category),
    ).order_by(Product.created_at.desc())

    if status:
        query = query.where(Product.status == status)
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))

    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    products = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "slug": p.slug,
            "price": float(p.price),
            "status": p.status,
            "total_stock": p.total_stock,
            "category": p.category.name if p.category else None,
            "created_at": p.created_at.isoformat(),
        }
        for p in products
    ]


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

    product = Product(
        **{k: v for k, v in data.model_dump().items() if k != "slug"},
        slug=slug,
    )
    db.add(product)
    await db.flush()

    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.variants),
                 selectinload(Product.category), selectinload(Product.subcategory))
        .where(Product.id == product.id)
    )
    return result.scalar_one()


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

    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(product, field, value)

    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.variants),
                 selectinload(Product.category), selectinload(Product.subcategory))
        .where(Product.id == product_id)
    )
    return result.scalar_one()


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


@router.post("/{product_id}/images", status_code=201)
async def upload_images(
    product_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if this is first image (make it primary)
    img_count_result = await db.execute(
        select(ProductImage).where(ProductImage.product_id == product_id)
    )
    existing_count = len(img_count_result.scalars().all())

    uploaded = []
    for i, file in enumerate(files[:8]):  # Max 8 images
        saved = await save_product_image(file, str(product_id))
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

    variant = ProductVariant(product_id=product_id, **data.model_dump())
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

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(variant, field, value)
    return variant
