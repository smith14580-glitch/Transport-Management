import logging

from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.errors import ApiError, error_envelope, ok
from app.db.session import get_db
from app.routers import (
    auth,
    bookings,
    cars,
    customers,
    dashboard,
    drivers,
    demo,
    payments,
    records,
    settings as settings_router,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hktransport")

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "HK Transport Management System API. All business endpoints are under "
        "/api/v1 and require a Bearer JWT (POST /api/v1/auth/login)."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ApiError)
async def api_error_handler(_request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status_code,
        content=error_envelope(exc.code, exc.message),
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request, exc: RequestValidationError):
    errors = exc.errors()
    message = "Invalid request."
    if errors:
        first = errors[0]
        location = ".".join(
            str(part)
            for part in first.get("loc", ())
            if part not in ("body", "query", "path")
        )
        detail = first.get("msg", "Invalid value")
        message = f"{location}: {detail}" if location else str(detail)
    return JSONResponse(
        status_code=422,
        content=error_envelope("VALIDATION_ERROR", message),
    )


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(_request, exc: StarletteHTTPException):
    codes = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
    }
    code = codes.get(exc.status_code, f"HTTP_{exc.status_code}")
    message = str(exc.detail) if exc.detail else code.replace("_", " ").title()
    return JSONResponse(
        status_code=exc.status_code,
        content=error_envelope(code, message),
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(_request, exc: Exception):
    logger.exception("Unhandled server error")
    return JSONResponse(
        status_code=500,
        content=error_envelope("INTERNAL_ERROR", "Internal server error."),
    )


@app.get("/health", tags=["health"])
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        raise ApiError(503, "DATABASE_UNAVAILABLE", "Database is not reachable.")
    return ok({"status": "ok"})


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(bookings.router)
app.include_router(cars.router)
app.include_router(payments.router)
app.include_router(records.router)
app.include_router(customers.router)
app.include_router(drivers.router)
app.include_router(settings_router.router)
app.include_router(demo.router)
