from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum


class DatabaseType(str, enum.Enum):
    MYSQL = "mysql"
    POSTGRESQL = "postgresql"
    MONGODB = "mongodb"
    SQLITE = "sqlite"


class DatabaseConnection(Base):
    __tablename__ = "database_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False, index=True)
    db_type = Column(Enum(DatabaseType), nullable=False)
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False)
    database_name = Column(String(255), nullable=False)
    username = Column(String(255), nullable=False)
    password = Column(Text, nullable=False)
    
    ssl_enabled = Column(Boolean, default=False)
    connection_timeout = Column(Integer, default=30)
    
    connection_status = Column(String(20), default="untested")
    is_active = Column(Boolean, default=True)
    is_self_hosted = Column(Boolean, default=False)
    
    description = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_tested_at = Column(DateTime, nullable=True)
    last_connected_at = Column(DateTime(timezone=True), nullable=True)
    
    owner = relationship("User", back_populates="database_connections", lazy="select")
    
    def __repr__(self):
        return f"<DatabaseConnection(id={self.id}, name='{self.name}', type='{self.db_type}', user_id={self.user_id})>"
    
    def to_dict(self, include_password=False):
        """Convert to dictionary (exclude password by default)"""
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "db_type": self.db_type.value,
            "host": self.host,
            "port": self.port,
            "database_name": self.database_name,
            "username": self.username,
            "ssl_enabled": self.ssl_enabled,
            "connection_timeout": self.connection_timeout,
            "connection_status": self.connection_status,
            "is_active": self.is_active,
            "is_self_hosted": self.is_self_hosted,
            "description": self.description,
            "tags": self.tags,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_tested_at": self.last_tested_at.isoformat() if self.last_tested_at else None,
            "last_connected_at": self.last_connected_at.isoformat() if self.last_connected_at else None,
        }
        
        if include_password:
            data["password"] = self.password
        
        return data