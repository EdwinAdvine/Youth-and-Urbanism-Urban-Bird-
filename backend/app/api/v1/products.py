from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional
import uuid
import math

from app.database import get_db
from app.models.product import Product, ProductVariant, ProductReview, Category, Subcategory
from app.models.user import User
from app.schemas.product import (
    ProductListItem, ProductDetail, ProductListResponse,
    ReviewOut, ReviewCreate, ProductSearchResult
)
from app.api.deps import get_current_active_user, get_optional_user
from app.utils.file_upload import save_review_image

router = APIRouter()


def _build_product_query(
    db: AsyncSession,
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sizes: Optional[str] = None,
    colors: Optional[str] = None,
    in_stock: Optional[bool] = None,
    on_sale: Optional[bool] = None,
    search: Optional[str] = None,
    sort: str = "latest",
    status: str = "active",
):
    query = select(Product).options(
        selectinload(Product.images),
        selectinload(Product.variants),
        selectinload(Product.category),
        selectinload(Product.subcategory),
    ).where(Product.status == status)

    if category:
        query = query.join(Category, Product.category_id == Category.id).where(Category.slug == category)
    if subcategory:
        query = query.join(Subcategory, Product.subcategory_id == Subcategory.id).where(Subcategory.slug == subcategory)
    if min_price is not None:
        query = query.where(Product.price >= min_price)
    if max_price is not None:
        query = query.where(Product.price <= max_price)
    if in_stock is True:
        query = query.where(Product.total_stock > 0)
    if on_sale is True:
        query = query.where(Product.is_on_sale == True)
    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(Product.name).contains(search.lower()),
                func.lower(Product.description).contains(search.lower()),
                func.lower(Product.brand).contains(search.lower()),
            )
        )

    sort_map = {
        "latest": Product.created_at.desc(),
        "popularity": Product.purchase_count.desc(),
        "rating": Product.average_rating.desc(),
        "price_asc": Product.price.asc(),
        "price_desc": Product.price.desc(),
        "name_asc": Product.name.asc(),
    }
    query = query.order_by(sort_map.get(sort, Product.created_at.desc()))
    return query


@router.get("", response_model=ProductListResponse)
async def list_products(
    db: AsyncSession = Depends(get_db),
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    in_stock: Optional[bool] = Query(None),
    on_sale: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("latest"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
):
    query = _build_product_query(db, category, subcategory, min_price, max_price,
                                  None, None, in_stock, on_sale, search, sort)

    # Count total
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    # Paginate
    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    products = result.scalars().all()

    # Build response items with primary image
    items = []
    for p in products:
        item = ProductListItem.model_validate(p)
        item.primary_image = None
        for img in p.images:
            if img.is_primary:
                item.primary_image = img
                break
        if not item.primary_image and p.images:
            item.primary_image = p.images[0]
        if p.category:
            item.category_slug = p.category.slug
        if p.subcategory:
            item.subcategory_slug = p.subcategory.slug
        items.append(item)

    return ProductListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit),
    )


@router.get("/featured", response_model=list[ProductListItem])
async def get_featured(db: AsyncSession = Depends(get_db), limit: int = Query(8)):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images))
        .where(Product.is_featured == True, Product.status == "active")
        .order_by(Product.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/new-arrivals", response_model=list[ProductListItem])
async def get_new_arrivals(db: AsyncSession = Depends(get_db), limit: int = Query(8)):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images))
        .where(Product.is_new_arrival == True, Product.status == "active")
        .order_by(Product.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/on-sale", response_model=list[ProductListItem])
async def get_on_sale(db: AsyncSession = Depends(get_db), limit: int = Query(8)):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images))
        .where(Product.is_on_sale == True, Product.status == "active")
        .order_by(Product.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/{slug}", response_model=ProductDetail)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.variants),
            selectinload(Product.category),
            selectinload(Product.subcategory),
        )
        .where(Product.slug == slug, Product.status == "active")
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Increment view count
    product.view_count += 1

    return product


@router.get("/{slug}/reviews", response_model=list[ReviewOut])
async def get_reviews(
    slug: str,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    result = await db.execute(select(Product).where(Product.slug == slug))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    result = await db.execute(
        select(ProductReview)
        .options(selectinload(ProductReview.user))
        .where(ProductReview.product_id == product.id, ProductReview.is_approved == True)
        .order_by(ProductReview.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    reviews = result.scalars().all()

    out = []
    for r in reviews:
        item = ReviewOut.model_validate(r)
        item.user_name = r.user.full_name if r.user else "Anonymous"
        out.append(item)
    return out


@router.post("/{slug}/reviews", response_model=ReviewOut, status_code=201)
async def create_review(
    slug: str,
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(Product).where(Product.slug == slug))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check duplicate
    existing = await db.execute(
        select(ProductReview).where(
            ProductReview.product_id == product.id,
            ProductReview.user_id == current_user.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already reviewed this product")

    if not (1 <= data.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    review = ProductReview(
        product_id=product.id,
        user_id=current_user.id,
        rating=data.rating,
        title=data.title,
        body=data.body,
        images=data.images,
        is_approved=True,  # Auto-approve; can add moderation later
    )
    db.add(review)
    await db.flush()

    # Update product rating
    result = await db.execute(
        select(func.avg(ProductReview.rating), func.count(ProductReview.id))
        .where(ProductReview.product_id == product.id, ProductReview.is_approved == True)
    )
    avg, count = result.one()
    product.average_rating = avg or 0
    product.review_count = count

    out = ReviewOut.model_validate(review)
    out.user_name = current_user.full_name
    return out


@router.post("/upload-review-image")
async def upload_review_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a photo to attach to a product review. Returns the image URL."""
    url = await save_review_image(file)
    return {"url": url}
