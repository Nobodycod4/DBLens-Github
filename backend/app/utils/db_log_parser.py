"""
Database Log Parser
Parses native database logs and imports them into audit_logs
"""
import re
from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.audit_logger import AuditLogger
import aiomysql
import asyncpg
import ssl as ssl_module
from motor.motor_asyncio import AsyncIOMotorClient
import aiosqlite


class DBLogParser:
    """Parse native database logs and import to audit_logs"""
    
    @staticmethod
    async def parse_mysql_general_log(
        db: AsyncSession,
        connection_id: int,
        db_type: str,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        ssl_enabled: bool = False,
        limit: int = 100
    ):
        """
        Parse MySQL general log
        Reads from mysql.general_log table
        """
        
        conn = None
        try:
            ssl_ctx = None
            if ssl_enabled:
                ssl_ctx = ssl_module.create_default_context()
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl_module.CERT_NONE
            
            conn = await aiomysql.connect(
                host=host,
                port=port,
                user=username,
                password=password,
                db="mysql",
                ssl=ssl_ctx,
                connect_timeout=10
            )
            
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                query = f"""
                SELECT 
                    event_time,
                    user_host,
                    command_type,
                    CONVERT(argument USING utf8) as argument
                FROM general_log
                WHERE command_type IN ('Query', 'Execute')
                AND CONVERT(argument USING utf8) NOT LIKE '%mysql.general_log%'
                AND CONVERT(argument USING utf8) NOT LIKE '%audit_logs%'
                ORDER BY event_time DESC
                LIMIT {limit}
                """
                
                await cursor.execute(query)
                rows = await cursor.fetchall()
                
                logs_imported = 0
                
                for row in rows:
                    event_time = row.get("event_time")
                    user_host = row.get("user_host", "unknown")
                    command_type = row.get("command_type")
                    argument = row.get("argument", "")
                    
                    if "[" in user_host:
                        user = user_host.split("[")[1].split("]")[0]
                    elif "@" in user_host:
                        user = user_host.split("@")[0].strip()
                    else:
                        user = user_host
                    
                    action_type = DBLogParser._detect_action_type(argument)
                    
                    await AuditLogger.log(
                        db=db,
                        source="database",
                        user_id=user,
                        action_type=action_type,
                        resource_type="direct_query",
                        resource_name=database,
                        action_description=f"Direct {action_type} via {command_type}",
                        query_executed=argument[:1000],
                        database_connection_id=connection_id,
                        success=True,
                    )
                    
                    logs_imported += 1
                
                return {
                    "success": True,
                    "logs_imported": logs_imported,
                    "message": f"Imported {logs_imported} database logs"
                }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    async def parse_postgresql_log(
        db: AsyncSession,
        connection_id: int,
        db_type: str,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        ssl_enabled: bool = False,
        limit: int = 100
    ):
        """
        Parse PostgreSQL logs
        Requires pg_stat_statements extension
        """
        
        conn = None
        try:
            conn = await asyncpg.connect(
                host=host,
                port=port,
                database=database,
                user=username,
                password=password,
                ssl='require' if ssl_enabled else 'prefer',
                timeout=10
            )
            
            try:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS pg_stat_statements;")
            except:
                pass
            
            query = f"""
            SELECT 
                queryid,
                query,
                calls,
                total_exec_time,
                mean_exec_time,
                rows
            FROM pg_stat_statements
            WHERE query NOT LIKE '%pg_stat_statements%'
            AND query NOT LIKE '%audit_logs%'
            ORDER BY calls DESC
            LIMIT {limit}
            """
            
            rows = await conn.fetch(query)
            
            logs_imported = 0
            
            for row in rows:
                query_text = row.get("query", "")
                calls = row.get("calls", 0)
                
                action_type = DBLogParser._detect_action_type(query_text)
                
                await AuditLogger.log(
                    db=db,
                    source="database",
                    user_id="postgres_user",
                    action_type=action_type,
                    resource_type="direct_query",
                    resource_name=database,
                    action_description=f"Direct {action_type} (executed {calls} times)",
                    query_executed=query_text[:1000],
                    database_connection_id=connection_id,
                    success=True,
                )
                
                logs_imported += 1
            
            return {
                "success": True,
                "logs_imported": logs_imported,
                "message": f"Imported {logs_imported} database logs"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            if conn:
                await conn.close()
    
    @staticmethod
    async def parse_mongodb_log(
        db: AsyncSession,
        connection_id: int,
        db_type: str,
        host: str,
        port: int,
        database: str,
        username: Optional[str],
        password: Optional[str],
        ssl_enabled: bool = False,
        limit: int = 100
    ):
        """
        Parse MongoDB logs from system.profile collection
        Note: Profiling must be enabled on the database
        """
        client = None
        try:
            if username and password:
                connection_string = f"mongodb://{username}:{password}@{host}:{port}/{database}"
            else:
                connection_string = f"mongodb://{host}:{port}/{database}"
            
            if ssl_enabled:
                connection_string += "?ssl=true"
            
            client = AsyncIOMotorClient(
                connection_string,
                serverSelectionTimeoutMS=10000
            )
            
            mongo_db = client[database]
            
            
            try:
                await mongo_db.command({"profile": 1, "slowms": 100})
            except:
                pass  
            
            
            profile_collection = mongo_db['system.profile']
            cursor = profile_collection.find().sort('ts', -1).limit(limit)
            
            logs_imported = 0
            
            async for doc in cursor:
                op_type = doc.get('op', 'unknown')
                namespace = doc.get('ns', '')
                command = doc.get('command', {})
                timestamp = doc.get('ts', datetime.now())
                duration_ms = doc.get('millis', 0)
                
                
                user = doc.get('user', 'unknown')
                if not user or user == '':
                    user = 'mongodb_user'
                
                
                action_type = DBLogParser._detect_mongodb_action_type(op_type)
                
                
                query_text = f"{op_type} on {namespace}: {str(command)[:500]}"
                
                await AuditLogger.log(
                    db=db,
                    source="database",
                    user_id=user,
                    action_type=action_type,
                    resource_type="direct_query",
                    resource_name=database,
                    action_description=f"Direct MongoDB {action_type}",
                    query_executed=query_text,
                    database_connection_id=connection_id,
                    duration_ms=duration_ms,
                    success=True,
                )
                
                logs_imported += 1
            
            return {
                "success": True,
                "logs_imported": logs_imported,
                "message": f"Imported {logs_imported} MongoDB logs"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            if client:
                client.close()
    
    @staticmethod
    async def parse_sqlite_log(
        db: AsyncSession,
        connection_id: int,
        db_type: str,
        host: str,
        port: int,
        database: str,
        username: Optional[str],
        password: Optional[str],
        ssl_enabled: bool = False,
        limit: int = 100
    ):
        """
        Parse SQLite logs
        Note: SQLite doesn't have native query logging
        This is a placeholder that returns no logs
        """
        try:
            return {
                "success": True,
                "logs_imported": 0,
                "message": "SQLite does not support native query logging. No logs to import."
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def _detect_action_type(query: str) -> str:
        """Detect action type from SQL query"""
        query_upper = query.strip().upper()
        
        if query_upper.startswith("SELECT"):
            return "QUERY"
        elif query_upper.startswith("INSERT"):
            return "INSERT"
        elif query_upper.startswith("UPDATE"):
            return "UPDATE"
        elif query_upper.startswith("DELETE"):
            return "DELETE"
        elif query_upper.startswith("CREATE"):
            return "CREATE"
        elif query_upper.startswith("ALTER"):
            return "ALTER"
        elif query_upper.startswith("DROP"):
            return "DROP"
        else:
            return "OTHER"
    
    @staticmethod
    def _detect_mongodb_action_type(op_type: str) -> str:
        """Detect action type from MongoDB operation type"""
        op_upper = op_type.upper()
        
        if op_upper in ["QUERY", "GETMORE"]:
            return "QUERY"
        elif op_upper == "INSERT":
            return "INSERT"
        elif op_upper == "UPDATE":
            return "UPDATE"
        elif op_upper == "REMOVE":
            return "DELETE"
        elif op_upper == "COMMAND":
            return "COMMAND"
        else:
            return "OTHER"