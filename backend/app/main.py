from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.staticfiles import StaticFiles
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from prometheus_client import CONTENT_TYPE_LATEST, REGISTRY, generate_latest
from sqlalchemy import text

from app.core.config import settings
from app.core.database import async_engine, AsyncSessionLocal
from app.core.logging import get_logger, setup_logging
from app.middleware.request_id import RequestIdMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.models.base import Base
from app.utils.org_startup import ensure_default_organizations

setup_logging(settings.LOG_LEVEL)
logger = get_logger(__name__)

from app.api.routes import (
    auth,
    databases,
    audit_logs,
    health,
    backups,
    backup_schedules,
    snapshots,
    migrations,
    roles,
    organizations,
    app_settings,
)


async def update_database_schema():
    """
    Update database schema by adding missing columns.
    Kept for backward compatibility with existing DBs. For new deployments,
    prefer: cd backend && alembic upgrade head.
    Once all environments use Alembic versioned migrations, this can be phased out.
    """
    import asyncpg
    
    schema_updates = [
        ("migrations", "migration_type", "VARCHAR(50) DEFAULT 'FULL'"),
        ("migrations", "is_dry_run", "BOOLEAN DEFAULT FALSE"),
        ("migrations", "dry_run_results", "JSON"),
        ("migrations", "transformation_rules", "JSON"),
        ("migrations", "filter_conditions", "JSON"),
        ("migrations", "last_sync_timestamp", "TIMESTAMP WITH TIME ZONE"),
        ("migrations", "template_id", "INTEGER"),
        ("migrations", "schedule_id", "INTEGER"),
        ("migrations", "can_rollback", "BOOLEAN DEFAULT TRUE"),
        ("migrations", "rollback_snapshot_id", "INTEGER"),
        ("migrations", "webhook_url", "VARCHAR(500)"),
        ("migrations", "notify_on_complete", "BOOLEAN DEFAULT FALSE"),
        ("migrations", "notify_on_failure", "BOOLEAN DEFAULT TRUE"),
        ("migrations", "migration_log", "JSON"),
        ("migration_templates", "target_db_type", "VARCHAR(50)"),
        ("app_settings", "created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
    ]
    
    async with async_engine.begin() as conn:
        for table_name, column_name, column_def in schema_updates:
            try:
                check_sql = text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = :table_name AND column_name = :column_name
                """)
                result = await conn.execute(check_sql, {"table_name": table_name, "column_name": column_name})
                exists = result.fetchone() is not None
                
                if not exists:
                    alter_sql = text(f'ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {column_name} {column_def}')
                    await conn.execute(alter_sql)
                    logger.info("  ✓ Added column: %s.%s", table_name, column_name)
            except Exception as e:
                pass
    
    try:
        db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        pg_conn = await asyncpg.connect(db_url)
        
        try:
            check_enum = await pg_conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'SUPER_ADMIN' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')
                )
            """)
            if not check_enum:
                await pg_conn.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'SUPER_ADMIN' BEFORE 'ADMIN'")
                logger.info("  ✓ Added SUPER_ADMIN to userrole enum")
        except Exception as e:
            pass
        
        data_fixes = [
            ("UPDATE migrations SET migration_type = 'FULL' WHERE migration_type = 'full'", "migration_type 'full' → 'FULL'"),
            ("UPDATE migrations SET migration_type = 'INCREMENTAL' WHERE migration_type = 'incremental'", "migration_type 'incremental' → 'INCREMENTAL'"),
            ("UPDATE migrations SET migration_type = 'SCHEMA_ONLY' WHERE migration_type = 'schema_only'", "migration_type 'schema_only' → 'SCHEMA_ONLY'"),
        ]
        
        for sql, desc in data_fixes:
            try:
                result = await pg_conn.execute(sql)
                count = int(result.split()[-1]) if result.startswith("UPDATE") else 0
                if count > 0:
                    logger.info("  ✓ Fixed %s rows: %s", count, desc)
            except Exception as e:
                pass
        
        await pg_conn.close()
    except Exception as e:
        logger.warning("  ⚠ Data fix skipped: %s", e)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Database Management Suite - Monitor, track, backup, and migrate databases",
    docs_url="/docs",
    redoc_url="/redoc"
)

scheduler = AsyncIOScheduler()

app.add_middleware(RequestIdMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Initialize database and create tables"""
    try:
        settings.validate_production_secrets()

        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        logger.info("🔧 Checking database schema...")
        await update_database_schema()
        logger.info("✓ Database schema is up to date")

        async with AsyncSessionLocal() as session:
            n = await ensure_default_organizations(session)
            if n:
                logger.info("  ✓ Created default organization(s) for %s user(s)", n)

        scheduler.start()
        logger.info("⏰ Backup scheduler: STARTED")

        logger.info("=" * 60)
        logger.info("✅ %s v%s started successfully", settings.PROJECT_NAME, settings.VERSION)
        logger.info("📊 Environment: %s", settings.ENVIRONMENT)
        logger.info("🔗 Database: Connected to PostgreSQL")
        logger.info("📝 Audit logging: ENABLED")
        logger.info("💾 Backup management: ENABLED")
        logger.info("⏰ Scheduled backups: ENABLED")
        logger.info("📈 Health monitoring: ENABLED")
        logger.info("🔐 Authentication: ENABLED")
        logger.info("🌐 API Docs: http://localhost:8000/docs")
        logger.info("=" * 60)
    except Exception as e:
        logger.exception("❌ Startup error: %s", e)
        raise


@app.on_event("startup")
async def print_routes():
    """Log all registered routes for debugging"""
    logger.info("📋 Registered API Routes:")
    for route in app.routes:
        if hasattr(route, "methods"):
            methods = ", ".join(route.methods)
            logger.info("  %s %s", methods.ljust(10), route.path)


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown"""
    await async_engine.dispose()
    scheduler.shutdown()
    logger.info("⏰ Backup scheduler: STOPPED")
    logger.info("👋 Application shutdown complete")


def _static_dir_path() -> Optional[Path]:
    """Resolve STATIC_DIR to an absolute path; return None if not set or missing."""
    if not (getattr(settings, "STATIC_DIR", None) or "").strip():
        return None
    p = Path(settings.STATIC_DIR.strip())
    if not p.is_absolute():
        p = Path(__file__).resolve().parent.parent / p
    return p if p.is_dir() else None


if _static_dir_path() is None:
    @app.get("/")
    async def root():
        """API root endpoint"""
        return {
            "message": f"Welcome to {settings.PROJECT_NAME}",
            "version": settings.VERSION,
            "status": "operational",
            "docs": "/docs",
            "features": [
                "User Authentication & Authorization",
                "Multi-tenant Database Management",
                "Database Connection Management",
                "Schema Inspection",
                "Query Execution",
                "Audit Logging",
                "Health Monitoring",
                "Backup Management",
                "Scheduled Backups",
                "Database Migrations",
                "Snapshot Management"
            ]
        }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }


@app.get("/health/live")
async def health_live():
    """Liveness probe – returns 200 if process is running."""
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready():
    """Readiness probe – returns 200 if DB is reachable, else 503."""
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        logger.warning("Readiness check failed: %s", e)
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "reason": "database"},
        )


@app.get("/metrics")
async def metrics():
    """Prometheus scrape endpoint (Phase 4)."""
    return Response(
        content=generate_latest(REGISTRY),
        media_type=CONTENT_TYPE_LATEST,
    )



app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_PREFIX}/auth",
    tags=["Authentication"]
)

app.include_router(
    databases.router,
    prefix=f"{settings.API_V1_PREFIX}/databases",
    tags=["Databases"]
)

app.include_router(
    audit_logs.router,
    prefix=f"{settings.API_V1_PREFIX}/audit-logs",
    tags=["Audit Logs"]
)

app.include_router(
    health.router,
    prefix=f"{settings.API_V1_PREFIX}/health",
    tags=["Health Monitoring"]
)

app.include_router(
    backups.router,
    prefix=f"{settings.API_V1_PREFIX}/backups",
    tags=["Backups"]
)

app.include_router(
    backup_schedules.router,
    prefix=f"{settings.API_V1_PREFIX}/backup-schedules",
    tags=["Backup Schedules"]
)

app.include_router(
    snapshots.router,
    prefix=f"{settings.API_V1_PREFIX}/snapshots",
    tags=["Snapshots"]
)

app.include_router(
    migrations.router,
    prefix=f"{settings.API_V1_PREFIX}/migrations",
    tags=["Migrations"]
)

app.include_router(
    roles.router,
    prefix=f"{settings.API_V1_PREFIX}/roles",
    tags=["Roles & Permissions"]
)

app.include_router(
    organizations.router,
    prefix=f"{settings.API_V1_PREFIX}/organizations",
    tags=["Organizations"]
)

app.include_router(
    app_settings.router,
    prefix=f"{settings.API_V1_PREFIX}/settings",
    tags=["Settings"]
)

_static = _static_dir_path()
if _static is not None:
    class _SpaStaticFiles(StaticFiles):
        """Serve static files and fallback to index.html for SPA client-side routes."""

        async def get_response(self, path: str, scope):
            response = await super().get_response(path, scope)
            if response.status_code == 404:
                return await super().get_response("index.html", scope)
            return response

    app.mount("/", _SpaStaticFiles(directory=str(_static), html=True), name="spa")
    logger.info("📁 Serving frontend from %s", _static)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle all unhandled exceptions; log server-side, return safe message to client."""
    request_id = getattr(request.state, "request_id", None) if request else None
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "message": "An unexpected error occurred",
            "detail": str(exc) if settings.DEBUG else "Internal server error",
            "correlation_id": request_id,
        },
    )