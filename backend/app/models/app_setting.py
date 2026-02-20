"""App-level key-value settings (e.g. default DB credentials)."""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from app.models.base import Base


class AppSetting(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
