from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.database_connection import DatabaseConnection
from app.models.health_metric import HealthMetric
from app.utils.health_monitor import HealthMonitor
from pydantic import BaseModel

router = APIRouter()



@router.get("")
@router.get("/")
async def get_system_health(db: AsyncSession = Depends(get_db)):
    """Get overall system health status"""
    import psutil
    import os
    
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        conn_result = await db.execute(select(func.count(DatabaseConnection.id)))
        total_connections = conn_result.scalar() or 0
        
        active_result = await db.execute(
            select(func.count(DatabaseConnection.id))
            .where(DatabaseConnection.is_active == True)
        )
        active_connections = active_result.scalar() or 0
        
        cutoff = datetime.utcnow() - timedelta(hours=1)
        metrics_result = await db.execute(
            select(func.count(HealthMetric.id))
            .where(HealthMetric.timestamp >= cutoff)
        )
        recent_metrics = metrics_result.scalar() or 0
        
        return {
            "status": "healthy",
            "uptime": "running",
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_used_gb": round(memory.used / (1024**3), 2),
                "memory_total_gb": round(memory.total / (1024**3), 2),
                "disk_percent": disk.percent,
                "disk_used_gb": round(disk.used / (1024**3), 2),
                "disk_total_gb": round(disk.total / (1024**3), 2)
            },
            "database": {
                "total_connections": total_connections,
                "active_connections": active_connections,
                "recent_metrics_count": recent_metrics
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "degraded",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/performance-stats")
async def get_performance_stats(
    db: AsyncSession = Depends(get_db)
):
    """Get aggregated performance statistics across all databases"""
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        
        result = await db.execute(
            select(HealthMetric)
            .where(HealthMetric.timestamp >= cutoff_time)
            .order_by(HealthMetric.timestamp.desc())
        )
        metrics = result.scalars().all()
        
        if not metrics:
            return {
                "total_databases": 0,
                "avg_query_time_ms": 0,
                "total_active_connections": 0,
                "avg_cache_hit_ratio": 0,
                "total_slow_queries": 0,
                "queries_per_second": 0,
                "peak_connections": 0,
                "total_samples": 0
            }
        
        unique_dbs = len(set(m.database_connection_id for m in metrics))
        
        return {
            "total_databases": unique_dbs,
            "avg_query_time_ms": round(sum(m.avg_query_time_ms or 0 for m in metrics) / len(metrics), 2),
            "total_active_connections": sum(m.active_connections or 0 for m in metrics[-unique_dbs:]) if metrics else 0,
            "avg_cache_hit_ratio": round(sum(m.cache_hit_ratio or 0 for m in metrics) / len(metrics), 2),
            "total_slow_queries": sum(m.slow_query_count or 0 for m in metrics),
            "queries_per_second": round(sum(m.queries_per_second or 0 for m in metrics[-unique_dbs:]) if metrics else 0, 2),
            "peak_connections": max((m.active_connections or 0) for m in metrics),
            "total_samples": len(metrics)
        }
    except Exception as e:
        print(f"Error getting performance stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/slow-queries")
async def get_slow_queries(
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Get slow queries across all monitored databases"""
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        
        result = await db.execute(
            select(HealthMetric, DatabaseConnection)
            .join(DatabaseConnection, HealthMetric.database_connection_id == DatabaseConnection.id)
            .where(
                and_(
                    HealthMetric.timestamp >= cutoff_time,
                    HealthMetric.slow_query_count > 0
                )
            )
            .order_by(HealthMetric.timestamp.desc())
            .limit(limit)
        )
        rows = result.all()
        
        slow_queries = []
        for metric, db_conn in rows:
            slow_queries.append({
                "id": metric.id,
                "database_name": db_conn.name,
                "database_type": db_conn.db_type.value if hasattr(db_conn.db_type, 'value') else str(db_conn.db_type),
                "connection_id": db_conn.id,
                "slow_query_count": metric.slow_query_count,
                "avg_query_time_ms": metric.avg_query_time_ms,
                "timestamp": metric.timestamp.isoformat(),
                "query": f"Slow queries detected on {db_conn.name}",
                "duration_ms": metric.avg_query_time_ms
            })
        
        return slow_queries
    except Exception as e:
        print(f"Error getting slow queries: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class HealthMetricResponse(BaseModel):
    id: int
    database_connection_id: int
    timestamp: datetime
    active_connections: Optional[int]
    max_connections: Optional[int]
    avg_query_time_ms: Optional[float]
    slow_query_count: Optional[int]
    queries_per_second: Optional[float]
    cache_hit_ratio: Optional[float]
    database_size_mb: Optional[float]
    
    class Config:
        from_attributes = True


@router.post("/collect/{connection_id}")
async def collect_health_metrics(
    connection_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Collect and store current health metrics for a database"""
    
    try:
        
        result = await db.execute(
            select(DatabaseConnection).where(DatabaseConnection.id == connection_id)
        )
        db_conn = result.scalar_one_or_none()
        
        if not db_conn:
            raise HTTPException(status_code=404, detail="Database connection not found")
        
        
        connection_config = {
            'host': db_conn.host,
            'port': db_conn.port,
            'username': db_conn.username,
            'password': db_conn.password,
            'database_name': db_conn.database_name
        }
        
        db_type = db_conn.db_type.value.lower()
        
        metrics = {}
        if db_type == 'mysql':
            metrics = await HealthMonitor.collect_mysql_metrics(connection_config)
        elif db_type == 'postgresql':
            metrics = await HealthMonitor.collect_postgresql_metrics(connection_config)
        elif db_type == 'mongodb':
            metrics = await HealthMonitor.collect_mongodb_metrics(connection_config)
        elif db_type == 'sqlite':
            metrics = await HealthMonitor.collect_sqlite_metrics(connection_config)
        else:
            raise HTTPException(status_code=400, detail=f"Health monitoring not supported for {db_type}")
        
        if not metrics:
            raise HTTPException(status_code=500, detail="Failed to collect metrics from database")
        
        
        health_metric = HealthMetric(
            database_connection_id=connection_id,
            active_connections=metrics.get('active_connections'),
            max_connections=metrics.get('max_connections'),
            avg_query_time_ms=metrics.get('avg_query_time_ms'),
            slow_query_count=metrics.get('slow_query_count'),
            queries_per_second=metrics.get('queries_per_second'),
            cache_hit_ratio=metrics.get('cache_hit_ratio'),
            database_size_mb=metrics.get('database_size_mb')
        )
        db.add(health_metric)
        await db.commit()
        await db.refresh(health_metric)
        
        return {
            "success": True,
            "message": "Health metrics collected successfully",
            "metrics": {
                "id": health_metric.id,
                "timestamp": health_metric.timestamp.isoformat(),
                "active_connections": health_metric.active_connections,
                "max_connections": health_metric.max_connections,
                "avg_query_time_ms": health_metric.avg_query_time_ms,
                "slow_query_count": health_metric.slow_query_count,
                "queries_per_second": health_metric.queries_per_second,
                "cache_hit_ratio": health_metric.cache_hit_ratio,
                "database_size_mb": health_metric.database_size_mb
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error collecting metrics: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to collect metrics: {str(e)}")


@router.get("/{connection_id}/current")
async def get_current_health(
    connection_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get the most recent health metrics for a database"""
    
    try:
        result = await db.execute(
            select(HealthMetric)
            .where(HealthMetric.database_connection_id == connection_id)
            .order_by(HealthMetric.timestamp.desc())
            .limit(1)
        )
        metric = result.scalar_one_or_none()
        
        if not metric:
            raise HTTPException(
                status_code=404, 
                detail="No health metrics found. Click 'Collect Metrics' to start monitoring."
            )
        
        return {
            "id": metric.id,
            "timestamp": metric.timestamp.isoformat(),
            "active_connections": metric.active_connections,
            "max_connections": metric.max_connections,
            "avg_query_time_ms": metric.avg_query_time_ms,
            "slow_query_count": metric.slow_query_count,
            "queries_per_second": metric.queries_per_second,
            "cache_hit_ratio": metric.cache_hit_ratio,
            "database_size_mb": metric.database_size_mb,
            "cpu_threshold": metric.cpu_threshold,
            "memory_threshold": metric.memory_threshold,
            "connection_threshold": metric.connection_threshold
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting current metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{connection_id}/history", response_model=List[HealthMetricResponse])
async def get_health_history(
    connection_id: int,
    hours: int = 24,
    db: AsyncSession = Depends(get_db)
):
    """Get historical health metrics for a database"""
    
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        result = await db.execute(
            select(HealthMetric)
            .where(
                and_(
                    HealthMetric.database_connection_id == connection_id,
                    HealthMetric.timestamp >= cutoff_time
                )
            )
            .order_by(HealthMetric.timestamp.asc())
        )
        metrics = result.scalars().all()
        
        return metrics
    except Exception as e:
        print(f"Error getting health history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{connection_id}/stats")
async def get_health_stats(
    connection_id: int,
    hours: int = 24,
    db: AsyncSession = Depends(get_db)
):
    """Get aggregated health statistics"""
    
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        result = await db.execute(
            select(HealthMetric)
            .where(
                and_(
                    HealthMetric.database_connection_id == connection_id,
                    HealthMetric.timestamp >= cutoff_time
                )
            )
            .order_by(HealthMetric.timestamp.asc())
        )
        metrics = result.scalars().all()
        
        if not metrics:
            return {
                "total_samples": 0,
                "avg_active_connections": 0,
                "avg_query_time": 0,
                "avg_cache_hit_ratio": 0,
                "peak_connections": 0,
                "total_slow_queries": 0,
            }
        
        
        return {
            "total_samples": len(metrics),
            "avg_active_connections": sum(m.active_connections or 0 for m in metrics) / len(metrics),
            "avg_query_time": sum(m.avg_query_time_ms or 0 for m in metrics) / len(metrics),
            "avg_cache_hit_ratio": sum(m.cache_hit_ratio or 0 for m in metrics) / len(metrics),
            "peak_connections": max((m.active_connections or 0) for m in metrics),
            "total_slow_queries": sum(m.slow_query_count or 0 for m in metrics),
        }
    except Exception as e:
        print(f"Error calculating stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))