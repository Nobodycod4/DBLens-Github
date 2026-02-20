# PyInstaller spec for DBLens backend.
# Run: pyinstaller dblens.spec
# Output: dist/dblens/dblens (or dblens.exe on Windows)
# Requires: PostgreSQL running, .env or env vars set, and optional backend/static (from build.sh).

import sys

block_cipher = None
# Collect all app submodules and common hidden imports for FastAPI/SQLAlchemy/asyncpg
hidden_imports = [
    "app.main",
    "app.core.config",
    "app.core.database",
    "app.core.logging",
    "app.models",
    "app.models.base",
    "app.models.user",
    "app.models.organization",
    "app.models.database_connection",
    "app.models.session",
    "app.models.audit_log",
    "app.models.backup",
    "app.models.backup_schedule",
    "app.models.migration",
    "app.models.snapshot",
    "app.models.connection_access",
    "app.api.routes",
    "app.api.routes.auth",
    "app.api.routes.databases",
    "app.api.routes.organizations",
    "app.api.routes.audit_logs",
    "app.api.routes.backups",
    "app.api.routes.backup_schedules",
    "app.api.routes.migrations",
    "app.api.routes.snapshots",
    "app.api.routes.health",
    "app.api.routes.roles",
    "app.api.routes.app_settings",
    "app.middleware.auth_middleware",
    "app.utils.org_scope",
    "app.utils.security",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "asyncpg",
    "sqlalchemy.dialects.postgresql.asyncpg",
]

a = Analysis(
    ["run_app.py"],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="dblens",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
