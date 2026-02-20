from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.database_connection import DatabaseType
from typing import Optional, List
from typing import Optional, List, Dict, Any, Literal

class DatabaseConnectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    db_type: DatabaseType
    host: str
    port: int
    database_name: str
    username: str
    password: str
    ssl_enabled: bool = False
    connection_timeout: int = 30
    description: Optional[str] = None
    tags: Optional[str] = None
    created_by: Optional[str] = None

class DatabaseConnectionUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    ssl_enabled: Optional[bool] = None
    connection_timeout: Optional[int] = None
    description: Optional[str] = None
    tags: Optional[str] = None
    is_active: Optional[bool] = None

class DatabaseConnectionResponse(BaseModel):
    id: int
    name: str
    db_type: DatabaseType
    host: str
    port: int
    database_name: str
    username: str
    ssl_enabled: bool
    is_active: bool
    last_connected_at: Optional[datetime] = None
    connection_status: str
    description: Optional[str] = None
    tags: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    
    class Config:
        from_attributes = True


class DatabaseConnectionWithAccess(DatabaseConnectionResponse):
    """Same as DatabaseConnectionResponse with access type for listing (owner vs shared)."""
    access_type: Literal["owner", "shared"] = "owner"


class ConnectionSharedWithUser(BaseModel):
    """One user who has access to a connection."""
    user_id: int
    username: str
    role: str = "use"


class ConnectionSharedWithGrant(BaseModel):
    """Body to grant access to a connection."""
    user_id: int
    role: Optional[str] = "use"


class ColumnInfo(BaseModel):
    name: str
    type: str  
    length: Optional[int] = None
    nullable: bool  
    default: Optional[str] = None
    extra: Optional[str] = None
        
    class Config:
        
        populate_by_name = True

class ForeignKeyInfo(BaseModel):
    column: str
    references_table: str
    references_column: str

class TableInfo(BaseModel):
    name: str
    type: str
    columns: List[ColumnInfo]
    primary_keys: List[str]
    foreign_keys: List[ForeignKeyInfo]
    row_count: int

class SchemaResponse(BaseModel):
    success: bool
    database_name: str
    database_type: str
    tables: Optional[List[TableInfo]] = None
    collections: Optional[List[dict]] = None  
    error: Optional[str] = None

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="SQL query to execute")
    limit: int = Field(default=100, ge=1, le=1000, description="Maximum rows to return")

class QueryResponse(BaseModel):
    success: bool
    columns: List[str]
    rows: List[Dict[str, Any]]
    row_count: int
    execution_time_ms: Optional[float] = None
    error: Optional[str] = None

class AuditLogCreate(BaseModel):
    """Schema for creating an audit log"""
    user_id: str
    user_email: Optional[str] = None
    action_type: str
    resource_type: str
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    action_description: Optional[str] = None
    changes_made: Optional[Dict[str, Any]] = None
    query_executed: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    success: str = "success"
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None
    database_connection_id: Optional[int] = None

class AuditLogResponse(BaseModel):
    """Schema for audit log response"""
    id: int
    user_id: str
    user_email: Optional[str]
    action_type: str
    resource_type: str
    resource_id: Optional[str]
    resource_name: Optional[str]
    action_description: Optional[str]
    changes_made: Optional[Dict[str, Any]]
    query_executed: Optional[str]
    ip_address: Optional[str]
    success: str
    error_message: Optional[str]
    timestamp: datetime
    duration_ms: Optional[int]
    database_connection_id: Optional[int]
    
    class Config:
        from_attributes = True

class AuditLogFilter(BaseModel):
    """Schema for filtering audit logs"""
    user_id: Optional[str] = None
    action_type: Optional[str] = None
    resource_type: Optional[str] = None
    success: Optional[str] = None
    database_connection_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None
    limit: int = 100
    offset: int = 0