"""
Database engine, session factory, and Base declarative class.
"""
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


# ------------------------------------------------------------------ #
# Engine                                                               #
# ------------------------------------------------------------------ #
engine = create_engine(
    settings.database_url,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_pre_ping=True,          # recycles stale connections
    echo=settings.debug,         # SQL logging in debug mode
)


# ------------------------------------------------------------------ #
# Session factory                                                      #
# ------------------------------------------------------------------ #
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ------------------------------------------------------------------ #
# Declarative Base                                                      #
# ------------------------------------------------------------------ #
class Base(DeclarativeBase):
    pass


# ------------------------------------------------------------------ #
# FastAPI dependency                                                   #
# ------------------------------------------------------------------ #
def get_db():
    """
    Yield a database session and ensure it is closed after the request,
    even if an exception is raised.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ------------------------------------------------------------------ #
# Startup helper                                                       #
# ------------------------------------------------------------------ #
def create_tables() -> None:
    """
    Create all tables that are registered on Base.metadata.
    Called once at application startup (dev/test convenience).
    For production use Alembic migrations instead.
    """
    Base.metadata.create_all(bind=engine)


def ping_db() -> bool:
    """Return True if the database is reachable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
