import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import (
    auth,
    blocks,
    cards,
    catalog,
    chat,
    curriculum,
    integrations,
    knowledge_graph,
    materials,
    organizations,
    queue,
    sessions,
    stats,
    tracks,
    user,
)
from app.domains.course.router import router as course_router
from app.domains.syllabus.router import router as syllabus_router
import app.models  # noqa: F401 - register all SQLAlchemy models before create_all.
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.services.auth_service import auth_enabled, decode_access_token, verify_legacy_token
from app.services.bootstrap import bootstrap
from app.services.cors_helpers import cors_middleware_kwargs

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
)
logger = logging.getLogger("compound")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Starting Compound API (ai_enabled=%s provider=%s)", settings.ai_enabled, settings.ai_provider)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        bootstrap(db)
    finally:
        db.close()
    logger.info("Compound API ready.")
    yield
    logger.info("Compound API shutting down.")


app = FastAPI(title="Compound Learning Platform", version="2.0.0", lifespan=lifespan)

app.add_middleware(CORSMiddleware, **cors_middleware_kwargs())

_PUBLIC_PATHS = {
    "/health",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/google",
    "/api/auth/google/callback",
    "/api/auth/google/status",
    "/api/integrations/lti/config",
}


def _token_valid(token: str | None) -> bool:
    if not token:
        return False
    if verify_legacy_token(token):
        return True
    return decode_access_token(token) is not None


@app.middleware("http")
async def require_auth(request: Request, call_next):
    if not auth_enabled():
        return await call_next(request)

    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path
    if path in _PUBLIC_PATHS or path.startswith("/docs") or path.startswith("/redoc") or path == "/openapi.json":
        return await call_next(request)

    auth_header = request.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ").strip() if auth_header.startswith("Bearer ") else None
    if not _token_valid(token):
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

    return await call_next(request)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Let FastAPI/Starlette HTTP errors (401/404/409/...) pass through unchanged.
    if isinstance(exc, (HTTPException, StarletteHTTPException)):
        return await http_exception_handler(request, exc)
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth.router, prefix="/api")
app.include_router(tracks.router, prefix="/api")
app.include_router(syllabus_router, prefix="/api")
app.include_router(course_router, prefix="/api")
app.include_router(materials.router, prefix="/api")
app.include_router(cards.router, prefix="/api")
app.include_router(catalog.router, prefix="/api")
app.include_router(queue.router, prefix="/api")
app.include_router(blocks.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(curriculum.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(organizations.router, prefix="/api")
app.include_router(knowledge_graph.router, prefix="/api")
app.include_router(integrations.router, prefix="/api")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": app.version,
        "ai_enabled": settings.ai_enabled,
        "ai_provider": settings.ai_provider if settings.ai_enabled else None,
    }
