from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
from typing import Optional
import uuid

from app.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.utils.security import hash_password
from app.api.deps import get_super_admin, get_admin_user

router = APIRouter()

STAFF_ROLES = ("admin", "super_admin", "viewer")


class StaffCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: str = "admin"  # admin | super_admin | viewer


class RoleUpdate(BaseModel):
    role: str


async def _log(
    db: AsyncSession,
    admin: User,
    action: str,
    entity_type: str = None,
    entity_id: str = None,
    old_value: dict = None,
    new_value: dict = None,
    description: str = None,
    ip_address: str = None,
):
    log = AuditLog(
        admin_id=admin.id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=old_value,
        new_value=new_value,
        description=description,
        ip_address=ip_address,
    )
    db.add(log)


@router.get("")
async def list_staff(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_super_admin),
):
    result = await db.execute(
        select(User)
        .where(User.role.in_(["admin", "super_admin", "viewer"]), User.is_deleted == False)
        .order_by(User.created_at.desc())
    )
    staff = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "first_name": s.first_name,
            "last_name": s.last_name,
            "email": s.email,
            "phone": s.phone,
            "role": s.role,
            "is_active": s.is_active,
            "is_verified": s.is_verified,
            "last_login": s.last_login.isoformat() if s.last_login else None,
            "created_at": s.created_at.isoformat(),
        }
        for s in staff
    ]


@router.post("", status_code=201)
async def create_staff(
    data: StaffCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_super_admin),
):
    if data.role not in STAFF_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(STAFF_ROLES)}")

    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already in use")

    new_staff = User(
        email=data.email,
        phone=data.phone,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role=data.role,
        is_active=True,
        is_verified=True,
    )
    db.add(new_staff)
    await db.flush()

    await _log(
        db, admin,
        action="create_staff",
        entity_type="user",
        entity_id=str(new_staff.id),
        new_value={"email": data.email, "role": data.role},
        description=f"Created staff account {data.email} with role {data.role}",
        ip_address=request.client.host if request.client else None,
    )

    return {
        "id": str(new_staff.id),
        "email": new_staff.email,
        "role": new_staff.role,
        "message": "Staff account created successfully",
    }


@router.patch("/{staff_id}/role")
async def update_staff_role(
    staff_id: uuid.UUID,
    data: RoleUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_super_admin),
):
    if data.role not in STAFF_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(STAFF_ROLES)}")

    result = await db.execute(select(User).where(User.id == staff_id, User.is_deleted == False))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if staff.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    old_role = staff.role
    staff.role = data.role

    await _log(
        db, admin,
        action="change_role",
        entity_type="user",
        entity_id=str(staff.id),
        old_value={"role": old_role},
        new_value={"role": data.role},
        description=f"Changed {staff.email} role from {old_role} to {data.role}",
        ip_address=request.client.host if request.client else None,
    )

    return {"message": f"Role updated to {data.role}", "email": staff.email}


@router.patch("/{staff_id}/toggle-status")
async def toggle_staff_status(
    staff_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_super_admin),
):
    result = await db.execute(select(User).where(User.id == staff_id, User.is_deleted == False))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if staff.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    staff.is_active = not staff.is_active

    await _log(
        db, admin,
        action="toggle_staff_status",
        entity_type="user",
        entity_id=str(staff.id),
        new_value={"is_active": staff.is_active},
        description=f"{'Activated' if staff.is_active else 'Deactivated'} staff account {staff.email}",
        ip_address=request.client.host if request.client else None,
    )

    return {
        "message": f"Staff {'activated' if staff.is_active else 'deactivated'}",
        "is_active": staff.is_active,
    }


@router.delete("/{staff_id}", status_code=204)
async def delete_staff(
    staff_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_super_admin),
):
    result = await db.execute(select(User).where(User.id == staff_id, User.is_deleted == False))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if staff.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    staff.is_deleted = True
    staff.deleted_at = datetime.now(timezone.utc)

    await _log(
        db, admin,
        action="delete_staff",
        entity_type="user",
        entity_id=str(staff.id),
        description=f"Soft-deleted staff account {staff.email}",
        ip_address=request.client.host if request.client else None,
    )


@router.get("/audit-log")
async def get_audit_log(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_super_admin),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    result = await db.execute(
        select(AuditLog, User.first_name, User.last_name, User.email)
        .join(User, User.id == AuditLog.admin_id, isouter=True)
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    rows = result.all()
    return [
        {
            "id": str(row.AuditLog.id),
            "admin": f"{row.first_name} {row.last_name}" if row.first_name else "Unknown",
            "admin_email": row.email,
            "action": row.AuditLog.action,
            "entity_type": row.AuditLog.entity_type,
            "entity_id": row.AuditLog.entity_id,
            "description": row.AuditLog.description,
            "old_value": row.AuditLog.old_value,
            "new_value": row.AuditLog.new_value,
            "ip_address": row.AuditLog.ip_address,
            "created_at": row.AuditLog.created_at.isoformat(),
        }
        for row in rows
    ]
