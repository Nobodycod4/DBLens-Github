"""Initial schema (DBLens metadata DB).

Revision ID: 001_initial
Revises: None
Create Date: 2025-02-19

Creates all tables from app.models. For existing DBs that already use
startup create_all/update_database_schema, this is a no-op when tables exist.
Run: alembic upgrade head
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.models import Base

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables from Base.metadata (idempotent if tables exist)."""
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    """Drop all tables. Use with caution on production."""
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
