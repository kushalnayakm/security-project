"""
BiometricPlatform — FastAPI application entry point.

Start the server:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import auth, otp, uploads, users
from app.core.config import settings
from app.core.database import create_tables, ping_db


# ------------------------------------------------------------------ #
# Logging                                                              #
# ------------------------------------------------------------------ #
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("biometric")


# ------------------------------------------------------------------ #
# Lifespan (startup / shutdown)                                        #
# ------------------------------------------------------------------ #
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---------- Startup ----------
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)

    if ping_db():
        logger.info("Database connection OK")
    else:
        logger.error(
            "Cannot reach database at %s — check DATABASE_URL in .env",
            settings.database_url,
        )

    create_tables()
    logger.info("Database tables ensured")

    settings.upload_path.mkdir(parents=True, exist_ok=True)
    logger.info("Upload directory: %s", settings.upload_path)

    yield

    # ---------- Shutdown ----------
    logger.info("%s shutting down", settings.app_name)


# ------------------------------------------------------------------ #
# App factory                                                          #
# ------------------------------------------------------------------ #
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Biometric identity platform — v1 scope: registration, photo upload, "
        "OTP verification, and user profiles. "
        "Face recognition and fingerprint SDK are stubbed with TODO placeholders."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ------------------------------------------------------------------ #
# CORS  ← must be registered before routers                           #
# ------------------------------------------------------------------ #
# Build a safe origins list: merge settings + always include localhost
# variants so local dev never breaks regardless of .env contents.
_origins_from_settings: list[str] = (
    settings.allowed_origins_list
    if isinstance(settings.allowed_origins_list, list)
    else [o.strip() for o in str(settings.allowed_origins_list).split(",") if o.strip()]
)

_dev_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",

    "https://localhost:5173",
    "https://127.0.0.1:5173",

    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",

    "http://10.113.129.47:5173",
    "https://10.113.129.47:5173",
]

# Deduplicate while preserving order
_all_origins: list[str] = list(dict.fromkeys(_origins_from_settings + _dev_origins))

logger.info("CORS allowed origins: %s", _all_origins)

##app.add_middleware(
    #CORSMiddleware,
    #allow_origins=[" *"],  # allow all origins for development; restrict in production
    #allow_credentials=True,
    #allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],  # explicit > wildcard
    #allow_headers=["*"],
    #expose_headers=["Content-Length", "X-Request-ID"],
    #max_age=600,  # preflight cache 10 min — reduces OPTIONS round-trips


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------ #
# Static files (serve uploaded selfies in dev)                        #
# ------------------------------------------------------------------ #
# TODO (v2): Remove this mount once files are served from S3/CDN.
app.mount(
    "/static/selfies",
    StaticFiles(directory=str(settings.upload_path), check_dir=False),
    name="selfies",
)


# ------------------------------------------------------------------ #
# Routers                                                              #
# ------------------------------------------------------------------ #
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(otp.router)
app.include_router(uploads.router)


# ------------------------------------------------------------------ #
# Global exception handlers                                            #
# ------------------------------------------------------------------ #
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again."},
    )


# ------------------------------------------------------------------ #
# Health / info routes                                                 #
# ------------------------------------------------------------------ #
@app.get("/health", tags=["Health"], summary="Health check")
def health_check():
    db_ok = ping_db()
    return {
        "status": "healthy" if db_ok else "degraded",
        "app": settings.app_name,
        "version": settings.app_version,
        "database": "connected" if db_ok else "unreachable",
    }


@app.get("/", tags=["Root"], include_in_schema=False)
def root():
    return {
        "message": f"Welcome to {settings.app_name} API",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
    }