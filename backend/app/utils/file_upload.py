import uuid
import os
from pathlib import Path
from fastapi import UploadFile, HTTPException
from PIL import Image
import io

from app.config import settings

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = settings.max_image_size_mb * 1024 * 1024


async def save_product_image(file: UploadFile, product_id: str) -> dict[str, str]:
    """Process and save a product image. Returns dict with url and thumbnail_url."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid image type: {file.content_type}")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail=f"Image too large. Max {settings.max_image_size_mb}MB")

    img = Image.open(io.BytesIO(contents))

    # Auto-orient (strip EXIF rotation)
    try:
        from PIL import ImageOps
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    product_dir = Path(settings.upload_dir) / "products" / product_id
    product_dir.mkdir(parents=True, exist_ok=True)

    filename = str(uuid.uuid4())

    # Save original (max 1200x1200)
    original = img.copy()
    original.thumbnail((1200, 1200), Image.LANCZOS)
    original_path = product_dir / f"{filename}.webp"
    original.save(str(original_path), "WEBP", quality=85)

    # Save thumbnail (400x400 — sharp on retina at standard card sizes)
    thumb = img.copy()
    thumb.thumbnail((400, 400), Image.LANCZOS)
    thumb_path = product_dir / f"{filename}_thumb.webp"
    thumb.save(str(thumb_path), "WEBP", quality=82)

    base_url = f"/uploads/products/{product_id}"
    return {
        "url": f"{base_url}/{filename}.webp",
        "thumbnail_url": f"{base_url}/{filename}_thumb.webp",
    }


async def save_review_image(file: UploadFile) -> str:
    """Process and save a review photo. Returns the URL string."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid image type: {file.content_type}")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail=f"Image too large. Max {settings.max_image_size_mb}MB")

    img = Image.open(io.BytesIO(contents))

    try:
        from PIL import ImageOps
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    review_dir = Path(settings.upload_dir) / "reviews"
    review_dir.mkdir(parents=True, exist_ok=True)

    filename = str(uuid.uuid4())

    # Save at 800x800 max (review photos don't need full res)
    img.thumbnail((800, 800), Image.LANCZOS)
    image_path = review_dir / f"{filename}.webp"
    img.save(str(image_path), "WEBP", quality=82)

    return f"/uploads/reviews/{filename}.webp"
