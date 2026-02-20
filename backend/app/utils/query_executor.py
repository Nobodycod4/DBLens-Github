"""
Database Query Executor Utility
Place this file at: backend/app/utils/query_executor.py
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import re
import json
import asyncpg
import aiomysql
from motor.motor_asyncio import AsyncIOMotorClient
import aiosqlite
import ssl as ssl_module


class QueryExecutor:
    """Handles safe query execution for different database types"""
    
    
    DANGEROUS_KEYWORDS = [
        'DROP', 'DELETE', 'TRUNCATE', 'INSERT', 'UPDATE',
        'ALTER', 'CREATE', 'GRANT', 'REVOKE', 'EXEC',
        'EXECUTE', 'SHUTDOWN', 'KILL'
    ]
    
    @staticmethod
    def validate_query(query: str, db_type: str = "sql") -> Dict[str, Any]:
        """
        Validate query for safety
        Returns: {"valid": bool, "error": str (optional)}
        """
        query_upper = query.strip().upper()
        
        
        if not query.strip():
            return {"valid": False, "error": "Query cannot be empty"}
        
        
        if db_type == "mongodb":
            try:
                
                json.loads(query)
                return {"valid": True}
            except json.JSONDecodeError as e:
                return {"valid": False, "error": f"Invalid MongoDB query JSON: {str(e)}"}
        
        
        
        for keyword in QueryExecutor.DANGEROUS_KEYWORDS:
            
            pattern = r'\b' + keyword + r'\b'
            if re.search(pattern, query_upper):
                return {
                    "valid": False,
                    "error": f"Query contains dangerous keyword: {keyword}. Only SELECT queries are allowed."
                }
        
        
        if not query_upper.startswith('SELECT') and not query_upper.startswith('SHOW') and not query_upper.startswith('DESCRIBE') and not query_upper.startswith('EXPLAIN'):
            return {
                "valid": False,
                "error": "Only SELECT, SHOW, DESCRIBE, and EXPLAIN queries are allowed"
            }
        
        return {"valid": True}
    
    @staticmethod
    async def execute_query(
        db_type: str,
        host: str,
        port: int,
        database: str,
        query: str,
        username: Optional[str] = None,
        password: Optional[str] = None,
        ssl_enabled: bool = False,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Execute query and return results
        
        Returns:
        {
            "success": bool,
            "columns": [...],
            "rows": [...],
            "row_count": int,
            "execution_time_ms": float,
            "error": str (optional)
        }
        """
        
        validation_db_type = "mongodb" if db_type == "mongodb" else "sql"
        validation = QueryExecutor.validate_query(query, validation_db_type)
        if not validation["valid"]:
            return {
                "success": False,
                "error": validation["error"],
                "columns": [],
                "rows": [],
                "row_count": 0
            }
        
        start_time = datetime.now()
        
        try:
            if db_type == "postgresql":
                result = await QueryExecutor._execute_postgresql(
                    host, port, database, query, username, password, ssl_enabled, limit
                )
            elif db_type == "mysql":
                result = await QueryExecutor._execute_mysql(
                    host, port, database, query, username, password, ssl_enabled, limit
                )
            elif db_type == "mongodb":
                result = await QueryExecutor._execute_mongodb(
                    host, port, database, query, username, password, ssl_enabled, limit
                )
            elif db_type == "sqlite":
                result = await QueryExecutor._execute_sqlite(
                    database, query, limit
                )
            else:
                return {
                    "success": False,
                    "error": f"Unsupported database type: {db_type}",
                    "columns": [],
                    "rows": [],
                    "row_count": 0
                }
            
            
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds() * 1000
            result["execution_time_ms"] = round(execution_time, 2)
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Query execution failed: {str(e)}",
                "columns": [],
                "rows": [],
                "row_count": 0
            }
    
    @staticmethod
    async def _execute_postgresql(
        host: str, port: int, database: str, query: str,
        username: str, password: str, ssl_enabled: bool, limit: int
    ) -> Dict[str, Any]:
        """Execute query on PostgreSQL"""
        conn = None
        try:
            conn = await asyncpg.connect(
                host=host, port=port, database=database,
                user=username, password=password,
                ssl='require' if ssl_enabled else 'prefer',
                timeout=10
            )
            
            
            query_upper = query.strip().upper()
            if 'LIMIT' not in query_upper:
                query = f"{query.strip()} LIMIT {limit}"
            
            
            rows = await conn.fetch(query)
            
            
            columns = []
            if rows:
                columns = list(rows[0].keys())
            
            
            rows_data = []
            for row in rows:
                row_dict = {}
                for col in columns:
                    value = row[col]
                    
                    if hasattr(value, 'isoformat'):
                        value = value.isoformat()
                    row_dict[col] = value
                rows_data.append(row_dict)
            
            return {
                "success": True,
                "columns": columns,
                "rows": rows_data,
                "row_count": len(rows_data)
            }
            
        finally:
            if conn:
                await conn.close()
    
    @staticmethod
    async def _execute_mysql(
        host: str, port: int, database: str, query: str,
        username: str, password: str, ssl_enabled: bool, limit: int
    ) -> Dict[str, Any]:
        """Execute query on MySQL"""
        conn = None
        try:
            ssl_ctx = None
            if ssl_enabled:
                ssl_ctx = ssl_module.create_default_context()
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl_module.CERT_NONE
            
            conn = await aiomysql.connect(
                host=host, port=port, user=username,
                password=password, db=database,
                ssl=ssl_ctx, connect_timeout=10
            )
            
            
            query_upper = query.strip().upper()
            if 'LIMIT' not in query_upper:
                query = f"{query.strip()} LIMIT {limit}"
            
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute(query)
                rows = await cursor.fetchall()
                
                
                columns = []
                if cursor.description:
                    columns = [desc[0] for desc in cursor.description]
                
                
                rows_data = []
                for row in rows:
                    row_dict = {}
                    for col in columns:
                        value = row[col]
                        
                        if hasattr(value, 'isoformat'):
                            value = value.isoformat()
                        row_dict[col] = value
                    rows_data.append(row_dict)
                
                return {
                    "success": True,
                    "columns": columns,
                    "rows": rows_data,
                    "row_count": len(rows_data)
                }
        
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    async def _execute_mongodb(
        host: str, port: int, database: str, query: str,
        username: Optional[str], password: Optional[str], ssl_enabled: bool, limit: int
    ) -> Dict[str, Any]:
        """Execute query on MongoDB"""
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
            
            db = client[database]
            
            
            
            query_obj = json.loads(query)
            
            collection_name = query_obj.get('collection')
            if not collection_name:
                return {
                    "success": False,
                    "error": "MongoDB query must specify 'collection' field",
                    "columns": [],
                    "rows": [],
                    "row_count": 0
                }
            
            collection = db[collection_name]
            
            
            filter_query = query_obj.get('filter', {})
            projection = query_obj.get('projection', None)
            sort = query_obj.get('sort', None)
            query_limit = query_obj.get('limit', limit)
            
            
            cursor = collection.find(filter_query, projection)
            
            if sort:
                cursor = cursor.sort(sort)
            
            cursor = cursor.limit(query_limit)
            
            
            documents = await cursor.to_list(length=query_limit)
            
            
            columns = []
            if documents:
                
                columns = list(documents[0].keys())
            
            
            rows_data = []
            for doc in documents:
                row_dict = {}
                for key, value in doc.items():
                    
                    if hasattr(value, '__str__') and type(value).__name__ == 'ObjectId':
                        value = str(value)
                    
                    elif hasattr(value, 'isoformat'):
                        value = value.isoformat()
                    row_dict[key] = value
                rows_data.append(row_dict)
            
            return {
                "success": True,
                "columns": columns,
                "rows": rows_data,
                "row_count": len(rows_data)
            }
            
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"Invalid MongoDB query JSON: {str(e)}",
                "columns": [],
                "rows": [],
                "row_count": 0
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"MongoDB query failed: {str(e)}",
                "columns": [],
                "rows": [],
                "row_count": 0
            }
        finally:
            if client:
                client.close()
    
    @staticmethod
    def _normalize_sqlite_query(query: str, limit: int) -> tuple:
        """
        Translate MySQL-style SHOW TABLES / DESCRIBE to SQLite equivalents.
        Returns (normalized_query, skip_limit) where skip_limit=True means do not append LIMIT.
        """
        q = query.strip()
        qu = q.upper()
        if qu.startswith("SHOW TABLES"):
            return "SELECT name AS \"Tables\" FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name", True
        if qu.startswith("SHOW TABLE STATUS"):
            return "SELECT name AS \"Name\" FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name", True
        if qu.startswith("DESCRIBE ") or qu.startswith("DESC "):
            prefix = "DESCRIBE " if qu.startswith("DESCRIBE ") else "DESC "
            table_part = q[len(prefix):].strip().rstrip(";").strip()
            if table_part.startswith("`"):
                end = table_part.find("`", 1)
                table_name = table_part[1:end] if end > 0 else table_part
            else:
                table_name = table_part.split()[0] if table_part.split() else table_part
            return f"PRAGMA table_info(\"{table_name}\")", True
        return q, False

    @staticmethod
    async def _execute_sqlite(
        database: str, query: str, limit: int
    ) -> Dict[str, Any]:
        """Execute query on SQLite (translates SHOW TABLES / DESCRIBE to SQLite equivalents)."""
        conn = None
        try:
            conn = await aiosqlite.connect(database, timeout=10)
            conn.row_factory = aiosqlite.Row

            normalized, skip_limit = QueryExecutor._normalize_sqlite_query(query, limit)
            query_upper = normalized.strip().upper()
            if not skip_limit and 'LIMIT' not in query_upper:
                normalized = f"{normalized.strip()} LIMIT {limit}"

            cursor = await conn.execute(normalized)
            rows = await cursor.fetchall()
            
            
            columns = []
            if cursor.description:
                columns = [desc[0] for desc in cursor.description]
            
            
            rows_data = []
            for row in rows:
                row_dict = {}
                for col in columns:
                    value = row[col]
                    
                    if hasattr(value, 'isoformat'):
                        value = value.isoformat()
                    row_dict[col] = value
                rows_data.append(row_dict)
            
            return {
                "success": True,
                "columns": columns,
                "rows": rows_data,
                "row_count": len(rows_data)
            }
        
        finally:
            if conn:
                await conn.close()
    
    @staticmethod
    async def execute_write_query(
        db_type: str,
        host: str,
        port: int,
        database: str,
        query: str,
        username: Optional[str] = None,
        password: Optional[str] = None,
        ssl_enabled: bool = False
    ) -> Dict[str, Any]:
        """
        Execute INSERT, UPDATE, DELETE, or DDL queries
        
        Returns:
        {
            "success": bool,
            "rows_affected": int,
            "execution_time_ms": float,
            "message": str,
            "error": str (optional)
        }
        """
        start_time = datetime.now()
        
        try:
            if db_type == "postgresql":
                result = await QueryExecutor._write_postgresql(
                    host, port, database, query, username, password, ssl_enabled
                )
            elif db_type == "mysql":
                result = await QueryExecutor._write_mysql(
                    host, port, database, query, username, password, ssl_enabled
                )
            elif db_type == "mongodb":
                result = await QueryExecutor._write_mongodb(
                    host, port, database, query, username, password, ssl_enabled
                )
            elif db_type == "sqlite":
                result = await QueryExecutor._write_sqlite(database, query)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported database type: {db_type}",
                    "rows_affected": 0
                }
            
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds() * 1000
            result["execution_time_ms"] = round(execution_time, 2)
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Query execution failed: {str(e)}",
                "rows_affected": 0
            }
    
    @staticmethod
    async def _write_postgresql(
        host: str, port: int, database: str, query: str,
        username: str, password: str, ssl_enabled: bool
    ) -> Dict[str, Any]:
        """Execute write query on PostgreSQL"""
        conn = None
        try:
            conn = await asyncpg.connect(
                host=host, port=port, database=database,
                user=username, password=password,
                ssl='require' if ssl_enabled else 'prefer',
                timeout=30
            )
            
            result = await conn.execute(query)
            
            rows_affected = 0
            if result:
                parts = result.split()
                if len(parts) >= 2 and parts[-1].isdigit():
                    rows_affected = int(parts[-1])
            
            return {
                "success": True,
                "rows_affected": rows_affected,
                "message": f"Query executed successfully. {result}"
            }
            
        finally:
            if conn:
                await conn.close()
    
    @staticmethod
    async def _write_mysql(
        host: str, port: int, database: str, query: str,
        username: str, password: str, ssl_enabled: bool
    ) -> Dict[str, Any]:
        """Execute write query on MySQL"""
        conn = None
        try:
            ssl_ctx = None
            if ssl_enabled:
                ssl_ctx = ssl_module.create_default_context()
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl_module.CERT_NONE
            
            conn = await aiomysql.connect(
                host=host, port=port, user=username,
                password=password, db=database,
                ssl=ssl_ctx, connect_timeout=30,
                charset='utf8mb4'
            )
            
            async with conn.cursor() as cursor:
                await cursor.execute(query)
                rows_affected = cursor.rowcount
                await conn.commit()
            
            return {
                "success": True,
                "rows_affected": rows_affected,
                "message": f"Query executed successfully. {rows_affected} rows affected."
            }
        
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    async def _write_mongodb(
        host: str, port: int, database: str, query: str,
        username: Optional[str], password: Optional[str], ssl_enabled: bool
    ) -> Dict[str, Any]:
        """Execute write operation on MongoDB"""
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
                serverSelectionTimeoutMS=30000
            )
            
            db = client[database]
            query_obj = json.loads(query)
            
            collection_name = query_obj.get('collection')
            if not collection_name:
                return {
                    "success": False,
                    "error": "MongoDB query must specify 'collection' field",
                    "rows_affected": 0
                }
            
            collection = db[collection_name]
            operation = query_obj.get('operation', 'find')
            
            if operation == 'insertOne':
                result = await collection.insert_one(query_obj.get('document', {}))
                return {
                    "success": True,
                    "rows_affected": 1,
                    "message": f"Inserted document with id: {result.inserted_id}"
                }
            elif operation == 'insertMany':
                result = await collection.insert_many(query_obj.get('documents', []))
                return {
                    "success": True,
                    "rows_affected": len(result.inserted_ids),
                    "message": f"Inserted {len(result.inserted_ids)} documents"
                }
            elif operation == 'updateOne':
                result = await collection.update_one(
                    query_obj.get('filter', {}),
                    query_obj.get('update', {})
                )
                return {
                    "success": True,
                    "rows_affected": result.modified_count,
                    "message": f"Modified {result.modified_count} document(s)"
                }
            elif operation == 'updateMany':
                result = await collection.update_many(
                    query_obj.get('filter', {}),
                    query_obj.get('update', {})
                )
                return {
                    "success": True,
                    "rows_affected": result.modified_count,
                    "message": f"Modified {result.modified_count} document(s)"
                }
            elif operation == 'deleteOne':
                result = await collection.delete_one(query_obj.get('filter', {}))
                return {
                    "success": True,
                    "rows_affected": result.deleted_count,
                    "message": f"Deleted {result.deleted_count} document(s)"
                }
            elif operation == 'deleteMany':
                result = await collection.delete_many(query_obj.get('filter', {}))
                return {
                    "success": True,
                    "rows_affected": result.deleted_count,
                    "message": f"Deleted {result.deleted_count} document(s)"
                }
            else:
                return {
                    "success": False,
                    "error": f"Unknown operation: {operation}",
                    "rows_affected": 0
                }
            
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"Invalid MongoDB query JSON: {str(e)}",
                "rows_affected": 0
            }
        finally:
            if client:
                client.close()
    
    @staticmethod
    async def _write_sqlite(database: str, query: str) -> Dict[str, Any]:
        """Execute write query on SQLite"""
        conn = None
        try:
            conn = await aiosqlite.connect(database, timeout=30)
            
            cursor = await conn.execute(query)
            rows_affected = cursor.rowcount
            await conn.commit()
            
            return {
                "success": True,
                "rows_affected": rows_affected,
                "message": f"Query executed successfully. {rows_affected} rows affected."
            }
        
        finally:
            if conn:
                await conn.close()