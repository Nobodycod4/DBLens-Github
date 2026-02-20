from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from .base import Base

class HealthMetric(Base):
    __tablename__ = "health_metrics"
    id = Column(Integer, primary_key=True, index=True)
    database_connection_id = Column(Integer, ForeignKey("database_connections.id"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    active_connections = Column(Integer, nullable=True)
    max_connections = Column(Integer, nullable=True)
    avg_query_time_ms = Column(Float, nullable=True)
    slow_query_count = Column(Integer, default=0)
    queries_per_second = Column(Float, nullable=True)
    cpu_usage_percent = Column(Float, nullable=True)
    memory_usage_mb = Column(Float, nullable=True)
    cache_hit_ratio = Column(Float, nullable=True)
    database_size_mb = Column(Float, nullable=True)
    cpu_threshold = Column(Float, default=80.0)
    memory_threshold = Column(Float, default=85.0)
    connection_threshold = Column(Float, default=90.0)