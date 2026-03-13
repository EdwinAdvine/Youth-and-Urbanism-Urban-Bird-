"""
seed_users.py — Creates test users and super admin for Urban Bird.
Run from the backend/ directory:

    python seed_users.py

Idempotent: re-running updates existing records instead of failing.
"""
import asyncio
import uuid
from datetime import datetime, timezone

import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import text

# ─── Database URL (localhost because this runs outside Docker) ─────────────────
DATABASE_URL = "postgresql+asyncpg://urbanbird:urbanbird_secret@localhost:5432/urbanbird_db"

# ─── Users to create ──────────────────────────────────────────────────────────
USERS = [
    {
        "email": "testuser1@urbanbird.co.ke",
        "password": "TestUser1@2026",
        "first_name": "Alice",
        "last_name": "Wanjiru",
        "phone": "+254711000001",
        "role": "customer",
    },
    {
        "email": "testuser2@urbanbird.co.ke",
        "password": "TestUser2@2026",
        "first_name": "Brian",
        "last_name": "Otieno",
        "phone": "+254722000002",
        "role": "customer",
    },
    {
        "email": "superadmin@urbanbird.co.ke",
        "password": "SuperAdmin@2026!",
        "first_name": "Urban",
        "last_name": "Admin",
        "phone": "+254733000003",
        "role": "super_admin",
    },
]


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


async def seed() -> None:
    engine = create_async_engine(DATABASE_URL, echo=False)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        for u in USERS:
            await session.execute(
                text("""
                    INSERT INTO users (
                        id, email, phone, password_hash,
                        first_name, last_name, role,
                        is_active, is_verified, is_deleted,
                        profile_data, created_at, updated_at
                    )
                    VALUES (
                        :id, :email, :phone, :password_hash,
                        :first_name, :last_name, :role,
                        true, true, false,
                        '{}', :ts, :ts
                    )
                    ON CONFLICT (email) DO UPDATE SET
                        password_hash = EXCLUDED.password_hash,
                        role           = EXCLUDED.role,
                        first_name     = EXCLUDED.first_name,
                        last_name      = EXCLUDED.last_name,
                        phone          = EXCLUDED.phone,
                        is_active      = true,
                        is_verified    = true,
                        updated_at     = EXCLUDED.updated_at
                """),
                {
                    "id": uuid.uuid4(),
                    "email": u["email"],
                    "phone": u["phone"],
                    "password_hash": hash_password(u["password"]),
                    "first_name": u["first_name"],
                    "last_name": u["last_name"],
                    "role": u["role"],
                    "ts": datetime.now(timezone.utc),
                },
            )
            label = "Super Admin" if u["role"] == "super_admin" else "Test User"
            print(f"  [{label}] {u['email']}  role={u['role']}")

        await session.commit()

    await engine.dispose()
    print("\nAll users seeded successfully.")


if __name__ == "__main__":
    print("Seeding Urban Bird users...\n")
    asyncio.run(seed())
