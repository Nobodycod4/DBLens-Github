"""
Database Schema Inspector Utility
Fixed version with both 'column' and 'column_name' fields for backwards compatibility
Place this file at: backend/app/utils/schema_inspector.py
"""
from typing import Dict, Any, List, Optional
import asyncpg
import aiomysql
from motor.motor_asyncio import AsyncIOMotorClient
import aiosqlite
import ssl as ssl_module
from datetime import datetime


class SchemaInspector:
    """Handles schema inspection for different database types"""
    
    @staticmethod
    async def get_schema(
        db_type: str,
        host: str,
        port: int,
        database: str,
        username: Optional[str] = None,
        password: Optional[str] = None,
        ssl_enabled: bool = False
    ) -> Dict[str, Any]:
        """
        Get complete database schema
        
        Returns:
        {
            "success": bool,
            "database_name": str,
            "tables": [...],
            "error": str (optional)
        }
        """
        try:
            if db_type == "postgresql":
                return await SchemaInspector._inspect_postgresql(
                    host, port, database, username, password, ssl_enabled
                )
            elif db_type == "mysql":
                return await SchemaInspector._inspect_mysql(
                    host, port, database, username, password, ssl_enabled
                )
            elif db_type == "mongodb":
                return await SchemaInspector._inspect_mongodb(
                    host, port, database, username, password, ssl_enabled
                )
            elif db_type == "sqlite":
                return await SchemaInspector._inspect_sqlite(database)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported database type: {db_type}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Schema inspection failed: {str(e)}"
            }
    
    @staticmethod
    async def _inspect_postgresql(
        host: str, port: int, database: str,
        username: str, password: str, ssl_enabled: bool
    ) -> Dict[str, Any]:
        """Inspect PostgreSQL schema"""
        conn = None
        try:
            conn = await asyncpg.connect(
                host=host, port=port, database=database,
                user=username, password=password,
                ssl='require' if ssl_enabled else 'prefer',
                timeout=10
            )
            
            tables_query = """
                SELECT 
                    table_name,
                    table_type
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
            """
            tables_raw = await conn.fetch(tables_query)
            
            tables = []
            for table_row in tables_raw:
                table_name = table_row['table_name']
                
                columns_query = """
                    SELECT 
                        column_name,
                        data_type,
                        character_maximum_length,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                    ORDER BY ordinal_position
                """
                columns_raw = await conn.fetch(columns_query, table_name)
                
                columns = []
                for col in columns_raw:
                    columns.append({
                        "name": col['column_name'],
                        "type": col['data_type'],
                        "length": col['character_maximum_length'],
                        "nullable": col['is_nullable'] == 'YES',
                        "default": col['column_default']
                    })
                
                pk_query = """
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.table_schema = 'public'
                        AND tc.table_name = $1
                        AND tc.constraint_type = 'PRIMARY KEY'
                """
                pk_raw = await conn.fetch(pk_query, table_name)
                primary_keys = [row['column_name'] for row in pk_raw]
                
                fk_query = """
                    SELECT
                        kcu.column_name,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                        ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu
                        ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                        AND tc.table_schema = 'public'
                        AND tc.table_name = $1
                """
                fk_raw = await conn.fetch(fk_query, table_name)
                
                foreign_keys = []
                for fk in fk_raw:
                    foreign_keys.append({
                        "column": fk['column_name'],  # FIXED: Added this field
                        "column_name": fk['column_name'],  # Keep for backwards compatibility
                        "references_table": fk['foreign_table_name'],
                        "references_column": fk['foreign_column_name']
                    })
                
                count_query = f'SELECT COUNT(*) FROM "{table_name}"'
                row_count = await conn.fetchval(count_query)
                
                tables.append({
                    "name": table_name,
                    "type": table_row['table_type'],
                    "columns": columns,
                    "primary_keys": primary_keys,
                    "foreign_keys": foreign_keys,
                    "row_count": row_count
                })
            
            return {
                "success": True,
                "database_name": database,
                "database_type": "postgresql",
                "tables": tables
            }
            
        finally:
            if conn:
                await conn.close()
    
    @staticmethod
    async def _inspect_mysql(
        host: str, port: int, database: str,
        username: str, password: str, ssl_enabled: bool
    ) -> Dict[str, Any]:
        """Inspect MySQL schema"""
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
            
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute("SHOW TABLES")
                tables_raw = await cursor.fetchall()
                
                tables = []
                for table_row in tables_raw:
                    table_name = list(table_row.values())[0]
                    
                    await cursor.execute(f"DESCRIBE `{table_name}`")
                    columns_raw = await cursor.fetchall()
                    
                    columns = []
                    primary_keys = []
                    
                    for col in columns_raw:
                        col_info = {
                            "name": col['Field'],
                            "type": col['Type'],
                            "nullable": col['Null'] == 'YES',
                            "default": col['Default'],
                            "extra": col['Extra']
                        }
                        columns.append(col_info)
                        
                        if col['Key'] == 'PRI':
                            primary_keys.append(col['Field'])
                    
                    fk_query = f"""
                        SELECT 
                            COLUMN_NAME,
                            REFERENCED_TABLE_NAME,
                            REFERENCED_COLUMN_NAME
                        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                        WHERE TABLE_SCHEMA = '{database}'
                            AND TABLE_NAME = '{table_name}'
                            AND REFERENCED_TABLE_NAME IS NOT NULL
                    """
                    await cursor.execute(fk_query)
                    fk_raw = await cursor.fetchall()
                    
                    foreign_keys = []
                    for fk in fk_raw:
                        foreign_keys.append({
                            "column": fk['COLUMN_NAME'],  # FIXED: Added this field
                            "column_name": fk['COLUMN_NAME'],  # Keep for backwards compatibility
                            "references_table": fk['REFERENCED_TABLE_NAME'],
                            "references_column": fk['REFERENCED_COLUMN_NAME']
                        })
                    
                    await cursor.execute(f"SELECT COUNT(*) as count FROM `{table_name}`")
                    count_result = await cursor.fetchone()
                    row_count = count_result['count']
                    
                    tables.append({
                        "name": table_name,
                        "type": "BASE TABLE",
                        "columns": columns,
                        "primary_keys": primary_keys,
                        "foreign_keys": foreign_keys,
                        "row_count": row_count
                    })
                
                return {
                    "success": True,
                    "database_name": database,
                    "database_type": "mysql",
                    "tables": tables
                }
        
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    async def _inspect_mongodb(
        host: str, port: int, database: str,
        username: Optional[str], password: Optional[str], ssl_enabled: bool
    ) -> Dict[str, Any]:
        """Inspect MongoDB schema"""
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
        
            collection_names = await db.list_collection_names()
        
            collections = []
            for coll_name in collection_names:
                collection = db[coll_name]
            
                doc_count = await collection.count_documents({})
            
                sample_size = min(100, doc_count) if doc_count > 0 else 0
                cursor = collection.find({}).limit(sample_size)
                samples = await cursor.to_list(length=sample_size)
            
                fields = []
                if samples:
                    all_fields = set()
                    for doc in samples:
                        all_fields.update(doc.keys())
                
                    for field_name in sorted(all_fields):
                        values = [doc.get(field_name) for doc in samples if field_name in doc]
                        non_null_values = [v for v in values if v is not None]
                    
                        if non_null_values:
                            sample_val = non_null_values[0]
                        
                            if isinstance(sample_val, bool):
                                data_type = "boolean"
                            elif isinstance(sample_val, int):
                                data_type = "integer"
                            elif isinstance(sample_val, float):
                                data_type = "double"
                            elif isinstance(sample_val, datetime):
                                data_type = "datetime"
                            elif isinstance(sample_val, dict):
                                data_type = "object"
                            elif isinstance(sample_val, list):
                                data_type = "array"
                            elif isinstance(sample_val, str):
                                data_type = "string"
                            else:
                                data_type = "string"
                        else:
                            data_type = "string"
                    
                        fields.append({
                            "name": field_name,
                            "type": data_type,
                            "nullable": len(non_null_values) < len(samples),
                            "default": None,
                            "length": None
                        })
            
                if not fields or not any(f["name"] == "_id" for f in fields):
                    fields.insert(0, {
                        "name": "_id",
                        "type": "string",
                        "nullable": False,
                        "default": None,
                        "length": None
                    })
            
                collections.append({
                    "name": coll_name,
                    "type": "collection",
                    "columns": fields,
                    "row_count": doc_count,
                    "primary_keys": ["_id"],
                    "foreign_keys": []
                })
            
            try:
                rel_coll = db.get("_dblens_relationships")
                if rel_coll:
                    rel_docs = await rel_coll.find({}).to_list(length=1000)
                    coll_by_name = {c["name"]: c for c in collections}
                    for doc in rel_docs:
                        from_coll = doc.get("from_collection")
                        if from_coll in coll_by_name:
                            coll_by_name[from_coll].setdefault("foreign_keys", []).append({
                                "column": doc.get("from_field"),
                                "column_name": doc.get("from_field"),
                                "references_table": doc.get("to_collection"),
                                "references_column": doc.get("to_field"),
                            })
            except Exception:
                pass
        
            return {
                "success": True,
                "database_name": database,
                "database_type": "mongodb",
                "tables": collections
            }
    
        finally:
            if client:
                client.close()

    @staticmethod
    async def _inspect_sqlite(database: str) -> Dict[str, Any]:
        """Inspect SQLite schema"""
        conn = None
        try:
            conn = await aiosqlite.connect(database, timeout=10)
            
            cursor = await conn.execute(
                "SELECT name, type FROM sqlite_master WHERE type='table' ORDER BY name"
            )
            tables_raw = await cursor.fetchall()
            
            tables = []
            for table_row in tables_raw:
                table_name = table_row[0]
                
                cursor = await conn.execute(f"PRAGMA table_info(`{table_name}`)")
                columns_raw = await cursor.fetchall()
                
                columns = []
                primary_keys = []
                
                for col in columns_raw:
                    col_info = {
                        "name": col[1],
                        "type": col[2],
                        "nullable": col[3] == 0,
                        "default": col[4]
                    }
                    columns.append(col_info)
                    
                    if col[5] > 0:
                        primary_keys.append(col[1])
                
                cursor = await conn.execute(f"PRAGMA foreign_key_list(`{table_name}`)")
                fk_raw = await cursor.fetchall()
                
                foreign_keys = []
                for fk in fk_raw:
                    foreign_keys.append({
                        "column": fk[3],  # FIXED: Added this field
                        "column_name": fk[3],  # Keep for backwards compatibility
                        "references_table": fk[2],
                        "references_column": fk[4]
                    })
                
                cursor = await conn.execute(f"SELECT COUNT(*) FROM `{table_name}`")
                row_count = (await cursor.fetchone())[0]
                
                tables.append({
                    "name": table_name,
                    "type": "table",
                    "columns": columns,
                    "primary_keys": primary_keys,
                    "foreign_keys": foreign_keys,
                    "row_count": row_count
                })
            
            return {
                "success": True,
                "database_name": database,
                "database_type": "sqlite",
                "tables": tables
            }
        
        finally:
            if conn:
                await conn.close()
    
    @staticmethod
    async def test_connection(
        db_type: str,
        host: str,
        port: int,
        database: str,
        username: str = None,
        password: str = None,
        ssl_enabled: bool = False
    ) -> Dict:
        """Test database connection"""
        try:
            if db_type == "mongodb":
                return await SchemaInspector._test_mongodb(
                    host, port, database, username, password
                )
            elif db_type == "sqlite":
                return await SchemaInspector._test_sqlite(database, host)
            elif db_type == "postgresql":
                return await SchemaInspector._test_postgresql(
                    host, port, database, username, password, ssl_enabled
                )
            elif db_type == "mysql":
                return await SchemaInspector._test_mysql(
                    host, port, database, username, password, ssl_enabled
                )
            else:
                return {
                    "success": False,
                    "error": f"Unsupported database type: {db_type}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    async def _test_postgresql(
        host: str, port: int, database: str,
        username: str, password: str, ssl_enabled: bool
    ) -> Dict:
        """Test PostgreSQL connection"""
        conn = None
        try:
            conn = await asyncpg.connect(
                host=host, port=port, database=database,
                user=username, password=password,
                ssl='require' if ssl_enabled else 'prefer',
                timeout=5
            )
            
            version = await conn.fetchval('SELECT version()')
            
            return {
                "success": True,
                "message": "Connection successful",
                "database_name": database,
                "version": version
            }
        
        finally:
            if conn:
                await conn.close()
    
    @staticmethod
    async def _test_mysql(
        host: str, port: int, database: str,
        username: str, password: str, ssl_enabled: bool
    ) -> Dict:
        """Test MySQL connection"""
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
                ssl=ssl_ctx, connect_timeout=5
            )
            
            async with conn.cursor() as cursor:
                await cursor.execute("SELECT VERSION()")
                version = (await cursor.fetchone())[0]
            
            return {
                "success": True,
                "message": "Connection successful",
                "database_name": database,
                "version": version
            }
        
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    async def _test_mongodb(
        host: str,
        port: int,
        database: str,
        username: str = None,
        password: str = None
    ) -> Dict:
        """Test MongoDB connection"""
        client = None
        try:
            if username:
                conn_str = f"mongodb://{username}:{password}@{host}:{port}"
            else:
                conn_str = f"mongodb://{host}:{port}"
            
            client = AsyncIOMotorClient(conn_str, serverSelectionTimeoutMS=5000)
            
            await client.server_info()
            
            db = client[database]
            collections = await db.list_collection_names()
            
            return {
                "success": True,
                "message": "Connection successful",
                "database_name": database,
                "collection_count": len(collections)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"MongoDB connection failed: {str(e)}"
            }
        finally:
            if client:
                client.close()
    
    @staticmethod
    async def _test_sqlite(database: str, db_path: str = None) -> Dict:
        """Test SQLite connection"""
        try:
            file_path = db_path if db_path else f"{database}.db"
            
            async with aiosqlite.connect(file_path) as conn:
                cursor = await conn.execute("SELECT sqlite_version()")
                version = (await cursor.fetchone())[0]
                
                cursor = await conn.execute(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
                )
                table_count = (await cursor.fetchone())[0]
                
                return {
                    "success": True,
                    "message": "Connection successful",
                    "database_name": database,
                    "sqlite_version": version,
                    "table_count": table_count
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"SQLite connection failed: {str(e)}"
            }