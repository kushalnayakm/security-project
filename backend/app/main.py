import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# Ensure app-level INFO logs (e.g. OTP banners) are visible in the uvicorn terminal.
# uvicorn only configures its own loggers by default; this covers the full 'app.*' namespace.
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:     %(name)s - %(message)s",
)

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.utils.responses import error_response


settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    description="API for managing customer registration, dynamic forms, and certificates.",
    version="1.0.0",
    debug=settings.debug
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    code = str(exc.detail).upper().replace(" ", "_") if isinstance(exc.detail, str) else "HTTP_ERROR"
    return JSONResponse(status_code=exc.status_code, content=error_response(code, str(exc.detail)))


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    # Normalize FastAPI validation errors into the existing API envelope.
    message = "; ".join(error["msg"] for error in exc.errors())
    return JSONResponse(
        status_code=422,
        content=error_response("VALIDATION_ERROR", message),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content=error_response("INTERNAL_SERVER_ERROR", str(exc)))


# API routes must be included BEFORE static file mounts.
# StaticFiles uses a greedy Starlette Mount which, if placed first,
# can shadow other routes during request dispatch.
app.include_router(api_router, prefix=settings.api_v1_prefix)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
