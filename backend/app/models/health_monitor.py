import asyncio
from typing import Dict, Optional
import aiomysql
import asyncpg


class HealthMonitor:
    """Collect health metrics from databases"""
    
    @staticmethod
    async def collect_mysql_metrics(connection_config: dict) -> Dict:
        """Collect health metrics from MySQL database"""
        try:
            conn = await aiomysql.connect(
                host=connection_config['host'],
                port=connection_config['port'],
                user=connection_config['username'],
                password=connection_config['password'],
                db=connection_config['database_name']
            )
            
            async with conn.cursor() as cursor:
                metrics = {}
                
                
                await cursor.execute("SHOW STATUS LIKE 'Threads_connected'")
                result = await cursor.fetchone()
                metrics['active_connections'] = int(result[1]) if result else 0
                
                
                await cursor.execute("SHOW VARIABLES LIKE 'max_connections'")
                result = await cursor.fetchone()
                metrics['max_connections'] = int(result[1]) if result else 0
                
                
                await cursor.execute("SHOW STATUS LIKE 'Questions'")
                result = await cursor.fetchone()
                metrics['queries_per_second'] = float(result[1]) / 60 if result else 0
                
                
                await cursor.execute("SHOW STATUS LIKE 'Qcache_hits'")
                hits = await cursor.fetchone()
                await cursor.execute("SHOW STATUS LIKE 'Qcache_inserts'")
                inserts = await cursor.fetchone()
                
                if hits and inserts:
                    total = int(hits[1]) + int(inserts[1])
                    metrics['cache_hit_ratio'] = (int(hits[1]) / total * 100) if total > 0 else 0
                else:
                    metrics['cache_hit_ratio'] = 0
                
                
                await cursor.execute(f"""
                    SELECT SUM(data_length + index_length) / 1024 / 1024 
                    FROM information_schema.tables 
                    WHERE table_schema = '{connection_config['database_name']}'
                """)
                result = await cursor.fetchone()
                metrics['database_size_mb'] = float(result[0]) if result and result[0] else 0
                
                
                await cursor.execute("SHOW STATUS LIKE 'Slow_queries'")
                result = await cursor.fetchone()
                metrics['slow_query_count'] = int(result[1]) if result else 0
                
                
                metrics['avg_query_time_ms'] = 50.0  
                
            conn.close()
            return metrics
            
        except Exception as e:
            print(f"Error collecting MySQL metrics: {e}")
            return {}
    
    @staticmethod
    async def collect_postgresql_metrics(connection_config: dict) -> Dict:
        """Collect health metrics from PostgreSQL database"""
        try:
            conn = await asyncpg.connect(
                host=connection_config['host'],
                port=connection_config['port'],
                user=connection_config['username'],
                password=connection_config['password'],
                database=connection_config['database_name']
            )
            
            metrics = {}
            
            
            result = await conn.fetchval(
                "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"
            )
            metrics['active_connections'] = result
            
            
            result = await conn.fetchval("SHOW max_connections")
            metrics['max_connections'] = int(result)
            
            
            result = await conn.fetchval(f"""
                SELECT pg_database_size('{connection_config['database_name']}') / 1024.0 / 1024.0
            """)
            metrics['database_size_mb'] = float(result)
            
            
            result = await conn.fetchrow("""
                SELECT 
                    sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0) * 100 as cache_hit_ratio
                FROM pg_stat_database
                WHERE datname = current_database()
            """)
            metrics['cache_hit_ratio'] = float(result['cache_hit_ratio']) if result else 0
            
            
            result = await conn.fetchval("""
                SELECT sum(xact_commit + xact_rollback) / 60.0
                FROM pg_stat_database
                WHERE datname = current_database()
            """)
            metrics['queries_per_second'] = float(result) if result else 0
            
            
            metrics['slow_query_count'] = 0
            metrics['avg_query_time_ms'] = 45.0
            
            await conn.close()
            return metrics
            
        except Exception as e:
            print(f"Error collecting PostgreSQL metrics: {e}")
            return {}