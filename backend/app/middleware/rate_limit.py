"""Global API rate limit middleware (per-IP)."""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.utils.rate_limiter import check_api_rate_limit

SKIP_PATHS = {"/", "/health", "/health/live", "/health/ready", "/metrics", "/docs", "/redoc", "/openapi.json"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP rate limit; skip health/docs; return 429 with Retry-After and X-RateLimit-Limit when exceeded."""

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.scope.get("path", "")
        if path in SKIP_PATHS or path.startswith("/docs") or path.startswith("/redoc") or path.startswith("/openapi"):
            return await call_next(request)
        client = request.client
        ip = client.host if client else "unknown"
        allowed, retry_after = check_api_rate_limit(ip, settings.RATE_LIMIT_API_PER_MINUTE)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests", "retry_after": int(retry_after)},
                headers={
                    "Retry-After": str(int(retry_after)),
                    "X-RateLimit-Limit": str(settings.RATE_LIMIT_API_PER_MINUTE),
                },
            )
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_API_PER_MINUTE)
        return response
