from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


# ── Async Engine ───────────────────────────────────────────────────────────────
# Uses asyncpg under the hood for non-blocking PostgreSQL I/O.
#
# pool_size=10    — number of persistent connections kept open
# max_overflow=20 — extra connections allowed under peak load (total max = 30)
# pool_pre_ping   — sends a lightweight "SELECT 1" before handing out a pooled
#                   connection to detect and discard stale connections
# pool_recycle=300 — force-close connections older than 5 minutes so they never
#                   hit PostgreSQL's idle-timeout (prevents "server closed the
#                   connection unexpectedly" errors after periods of inactivity)
# echo            — logs all SQL statements in development for debugging
engine = create_async_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.environment == "development",
)

# ── Session Factory ────────────────────────────────────────────────────────────
# expire_on_commit=False — keeps ORM objects usable after commit without
#   triggering lazy-load re-fetches (important for async: lazy loads would raise)
# autoflush=False        — we control when SQL is flushed to the DB, preventing
#   accidental partial writes mid-route
# autocommit=False       — all writes require an explicit commit (handled by get_db)
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    """
    Shared declarative base for all SQLAlchemy ORM models.

    Every model in `app/models/` inherits from this class.
    `Base.metadata.create_all()` in main.py uses this registry to
    create all tables on startup.
    """
    pass


async def get_db() -> AsyncSession:
    """
    FastAPI dependency that provides a database session for each request.

    Usage in a route:
        async def my_route(db: AsyncSession = Depends(get_db)):
            ...

    Behaviour:
    - Yields the session to the route handler.
    - Commits automatically on success (when the route returns without raising).
    - Rolls back automatically on any unhandled exception, then re-raises it
      so FastAPI can return the appropriate error response.
    - Always closes the session (returns the connection to the pool) in the
      finally block, even if commit or rollback raised a secondary error.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
