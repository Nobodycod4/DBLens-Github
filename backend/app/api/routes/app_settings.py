"""App settings API (e.g. default DB credentials for Create new DB / Migration)."""
from typing import Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.app_setting import AppSetting
from app.models.user import User, UserRole
from app.utils.security import encrypt_password, decrypt_password

router = APIRouter()

KEY_DEFAULT_DB_USERNAME = "default_db_username"
KEY_DEFAULT_DB_PASSWORD = "default_db_password"


class DefaultDBCredentialsResponse(BaseModel):
    has_defaults: bool
    username: Optional[str] = None


class DefaultDBCredentialsPut(BaseModel):
    username: str
    password: Optional[str] = None


async def _get_setting(db: AsyncSession, key: str) -> Optional[str]:
    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    row = result.scalar_one_or_none()
    return row.value if row else None


async def _set_setting(db: AsyncSession, key: str, value: Optional[str]) -> None:
    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    row = result.scalar_one_or_none()
    if row:
        row.value = value
    else:
        db.add(AppSetting(key=key, value=value))
    await db.commit()


@router.get("/default-db-credentials", response_model=DefaultDBCredentialsResponse)
async def get_default_db_credentials(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return whether default DB credentials are set. Does not return the password."""
    username = await _get_setting(db, KEY_DEFAULT_DB_USERNAME)
    password_enc = await _get_setting(db, KEY_DEFAULT_DB_PASSWORD)
    has_defaults = bool(username and password_enc)
    return DefaultDBCredentialsResponse(
        has_defaults=has_defaults,
        username=username if has_defaults else None,
    )


@router.put("/default-db-credentials")
async def put_default_db_credentials(
    body: DefaultDBCredentialsPut,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set default DB username and password (for Create new DB and Migration). Requires admin."""
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can set default DB credentials",
        )
    await _set_setting(db, KEY_DEFAULT_DB_USERNAME, body.username.strip() or None)
    if body.password is not None and body.password != "":
        encrypted = encrypt_password(body.password)
        await _set_setting(db, KEY_DEFAULT_DB_PASSWORD, encrypted)
    return {"message": "Default DB credentials updated"}


async def get_default_db_credentials_async(db: AsyncSession) -> Tuple[Optional[str], Optional[str]]:
    """Return (username, password) from app settings, or (None, None) if not set. Password is decrypted."""
    username = await _get_setting(db, KEY_DEFAULT_DB_USERNAME)
    password_enc = await _get_setting(db, KEY_DEFAULT_DB_PASSWORD)
    if not username or not password_enc:
        return None, None
    try:
        password = decrypt_password(password_enc)
        return username, password
    except Exception:
        return None, None
