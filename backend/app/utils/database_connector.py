"""
Database Connection Testing Utility
Place this file at: backend/app/utils/database_connector.py
"""
from typing import Dict, Any, Optional
from datetime import datetime
import asyncpg
import aiomysql
from motor.motor_asyncio import AsyncIOMotorClient
import aiosqlite
import ssl as ssl_module
import os


class DatabaseConnector:
    """Handles connection testing AND database creation for different database types"""
    
    @staticmethod
    async def test_connection(
        db_type: str,
        host: str,
        port: int,
        database: str,
        username: Optional[str] = None,
        password: Optional[str] = None,
        ssl_enabled: bool = False,
        connection_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Test database connection and return results
        
        Returns dict with:
        - success: bool
        - message: str
        - details: dict (latency_ms, server_version, etc.)
        - error: str (only if failed)
        """
        start_time = datetime.now()
        
        try:
            if db_type == "postgresql":
                result = await DatabaseConnector._test_postgresql(
                    host, port, database, username, password, ssl_enabled
                )
            elif db_type == "mysql":
                result = await DatabaseConnector._test_mysql(
                    host, port, database, username, password, ssl_enabled
                )
            elif db_type == "mongodb":
                result = await DatabaseConnector._test_mongodb(
                    host, port, database, username, password, ssl_enabled
                )
            elif db_type == "sqlite":
                result = await DatabaseConnector._test_sqlite(database)
            else:
                return {
                    "success": False,
                    "message": f"Unsupported database type: {db_type}",
                    "error": f"Database type '{db_type}' is not supported"
                }
            
            
            end_time = datetime.now()
            latency_ms = (end_time - start_time).total_seconds() * 1000
            
            if result["success"]:
                result["details"]["latency_ms"] = round(latency_ms, 2)
                result["details"]["tested_at"] = datetime.now().isoformat()
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Connection failed: {str(e)}",
                "error": str(e),
                "details": {}
            }
    
    @staticmethod
    async def _test_postgresql(
        host: str, port: int, database: str,
        username: str, password: str, ssl_enabled: bool
    ) -> Dict[str, Any]:
        """Test PostgreSQL connection using asyncpg"""
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
            
            
            version = await conn.fetchval('SELECT version()')
            
            
            size_query = """
                SELECT pg_size_pretty(pg_database_size($1))
            """
            db_size = await conn.fetchval(size_query, database)
            
            return {
                "success": True,
                "message": "PostgreSQL connection successful",
                "details": {
                    "server_version": version.split(',')[0],
                    "database_size": db_size
                }
            }
            
        except asyncpg.InvalidPasswordError:
            return {
                "success": False,
                "message": "Authentication failed: Invalid username or password",
                "error": "Invalid credentials",
                "details": {}
            }
        except asyncpg.InvalidCatalogNameError:
            return {
                "success": False,
                "message": f"Database '{database}' does not exist",
                "error": "Database not found",
                "details": {}
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"PostgreSQL connection failed: {str(e)}",
                "error": str(e),
                "details": {}
            }
        finally:
            if conn:
                await conn.close()
    
    @staticmethod
    async def _test_mysql(
        host: str, port: int, database: str,
        username: str, password: str, ssl_enabled: bool
    ) -> Dict[str, Any]:
        """Test MySQL connection using aiomysql"""
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
                db=database,
                ssl=ssl_ctx,
                connect_timeout=10
            )
            
            async with conn.cursor() as cursor:
                
                await cursor.execute("SELECT VERSION()")
                version = await cursor.fetchone()
                
                
                await cursor.execute("""
                    SELECT 
                        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
                    FROM information_schema.TABLES 
                    WHERE table_schema = %s
                """, (database,))
                size_result = await cursor.fetchone()
                db_size = f"{size_result[0]} MB" if size_result[0] else "0 MB"
            
            return {
                "success": True,
                "message": "MySQL connection successful",
                "details": {
                    "server_version": version[0],
                    "database_size": db_size
                }
            }
            
        except aiomysql.OperationalError as e:
            error_msg = str(e)
            if "Access denied" in error_msg:
                return {
                    "success": False,
                    "message": "Authentication failed: Invalid username or password",
                    "error": "Invalid credentials",
                    "details": {}
                }
            elif "Unknown database" in error_msg:
                return {
                    "success": False,
                    "message": f"Database '{database}' does not exist",
                    "error": "Database not found",
                    "details": {}
                }
            else:
                return {
                    "success": False,
                    "message": f"MySQL connection failed: {error_msg}",
                    "error": error_msg,
                    "details": {}
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"MySQL connection failed: {str(e)}",
                "error": str(e),
                "details": {}
            }
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    async def _test_mongodb(
        host: str, port: int, database: str,
        username: Optional[str], password: Optional[str], ssl_enabled: bool
    ) -> Dict[str, Any]:
        """Test MongoDB connection using motor"""
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
            
            
            await client.admin.command('ping')
            
            
            server_info = await client.server_info()
            
            
            db = client[database]
            stats = await db.command("dbstats")
            
            db_size_mb = stats.get('dataSize', 0) / (1024 * 1024)
            
            return {
                "success": True,
                "message": "MongoDB connection successful",
                "details": {
                    "server_version": server_info.get('version', 'Unknown'),
                    "database_size": f"{db_size_mb:.2f} MB"
                }
            }
            
        except Exception as e:
            error_msg = str(e)
            if "Authentication failed" in error_msg:
                return {
                    "success": False,
                    "message": "Authentication failed: Invalid username or password",
                    "error": "Invalid credentials",
                    "details": {}
                }
            else:
                return {
                    "success": False,
                    "message": f"MongoDB connection failed: {error_msg}",
                    "error": error_msg,
                    "details": {}
                }
        finally:
            if client:
                client.close()
    
    @staticmethod
    async def _test_sqlite(database: str) -> Dict[str, Any]:
        """Test SQLite connection using aiosqlite"""
        conn = None
        try:
            conn = await aiosqlite.connect(database, timeout=10)
            
            
            cursor = await conn.execute("SELECT sqlite_version()")
            version = await cursor.fetchone()
            
            
            cursor = await conn.execute("PRAGMA page_count")
            page_count = (await cursor.fetchone())[0]
            
            cursor = await conn.execute("PRAGMA page_size")
            page_size = (await cursor.fetchone())[0]
            
            db_size_mb = (page_count * page_size) / (1024 * 1024)
            
            return {
                "success": True,
                "message": "SQLite connection successful",
                "details": {
                    "server_version": f"SQLite {version[0]}",
                    "database_size": f"{db_size_mb:.2f} MB"
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"SQLite connection failed: {str(e)}",
                "error": str(e),
                "details": {}
            }
        finally:
            if conn:
                await conn.close()


    @staticmethod
    async def create_database(
        db_type: str,
        database_name: str,
        username: str = "admin",
        password: str = "admin123",
        storage_path: str = "./dblens_databases"
    ) -> Dict[str, Any]:
        """
        Create a new database instance (native - no Docker)
        
        Returns dict with:
        - success: bool
        - message: str
        - connection_details: dict (host, port, database, username, password)
        """
        try:
            if db_type == "sqlite":
                os.makedirs(storage_path, exist_ok=True)
                return await DatabaseConnector._create_sqlite(storage_path, database_name)
            elif db_type == "postgresql":
                return await DatabaseConnector._create_postgresql_native(
                    database_name, username, password
                )
            elif db_type == "mysql":
                return await DatabaseConnector._create_mysql_native(
                    database_name, username, password
                )
            elif db_type == "mongodb":
                return await DatabaseConnector._create_mongodb_native(
                    database_name, username, password
                )
            else:
                return {
                    "success": False,
                    "message": f"Database type '{db_type}' not supported for creation"
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to create database: {str(e)}"
            }

    @staticmethod
    async def _create_sqlite(storage_path: str, database_name: str) -> Dict[str, Any]:
        """Create a new SQLite database file"""
        db_path = os.path.join(storage_path, f"{database_name}.db")
        
        if os.path.exists(db_path):
            return {
                "success": False,
                "message": f"Database '{database_name}' already exists"
            }
        
        conn = await aiosqlite.connect(db_path)
        await conn.close()
        
        return {
            "success": True,
            "message": f"SQLite database '{database_name}' created successfully",
            "connection_details": {
                "host": "localhost",
                "port": 0,  # SQLite doesn't use ports
                "database": db_path,
                "username": "",
                "password": ""
            }
        }

    @staticmethod
    async def _create_postgresql_native(
        database_name: str, username: str, password: str
    ) -> Dict[str, Any]:
        """Create PostgreSQL database on local server"""
        conn = None
        try:
            from app.core.config import settings
            
            conn = await asyncpg.connect(
                host='localhost',
                port=5432,
                database='postgres',  # Connect to default DB
                user=settings.DATABASE_USER,
                password=settings.DATABASE_PASSWORD,
                timeout=10
            )
            
            exists = await conn.fetchval(
                "SELECT 1 FROM pg_database WHERE datname = $1", 
                database_name
            )
            
            if exists:
                await conn.close()
                return {
                    "success": False,
                    "message": f"Database '{database_name}' already exists"
                }
            
            await conn.execute(f'CREATE DATABASE "{database_name}"')
            
            user_exists = await conn.fetchval(
                "SELECT 1 FROM pg_roles WHERE rolname = $1",
                username
            )
            
            if not user_exists:
                await conn.execute(
                    f"CREATE USER {username} WITH PASSWORD '{password}'"
                )
            
            await conn.execute(
                f'GRANT ALL PRIVILEGES ON DATABASE "{database_name}" TO {username}'
            )
            
            await conn.close()
            
            return {
                "success": True,
                "message": f"PostgreSQL database '{database_name}' created successfully",
                "connection_details": {
                    "host": "localhost",
                    "port": 5432,
                    "database": database_name,
                    "username": username,
                    "password": password
                }
            }
            
        except Exception as e:
            if conn:
                await conn.close()
            return {
                "success": False,
                "message": f"Failed to create PostgreSQL database: {str(e)}"
            }

    @staticmethod
    async def _create_mysql_native(
        database_name: str, username: str, password: str
    ) -> Dict[str, Any]:
        """Create MySQL database on local server"""
        conn = None
        try:
            from app.core.config import settings
            
            conn = await aiomysql.connect(
                host='localhost',
                port=3306,
                user='root',  # Your root user
                password='root',
                connect_timeout=10
            )
            
            async with conn.cursor() as cursor:
                await cursor.execute(
                    "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = %s",
                    (database_name,)
                )
                exists = await cursor.fetchone()
                
                if exists:
                    conn.close()
                    return {
                        "success": False,
                        "message": f"Database '{database_name}' already exists"
                    }
                
                await cursor.execute(f"CREATE DATABASE `{database_name}`")
                
                await cursor.execute(
                    f"CREATE USER IF NOT EXISTS '{username}'@'localhost' IDENTIFIED BY '{password}'"
                )
                await cursor.execute(
                    f"GRANT ALL PRIVILEGES ON `{database_name}`.* TO '{username}'@'localhost'"
                )
                await cursor.execute("FLUSH PRIVILEGES")
                await conn.commit()
            
            conn.close()
            
            return {
                "success": True,
                "message": f"MySQL database '{database_name}' created successfully",
                "connection_details": {
                    "host": "localhost",
                    "port": 3306,
                    "database": database_name,
                    "username": username,
                    "password": password
                }
            }
            
        except Exception as e:
            if conn:
                conn.close()
            return {
                "success": False,
                "message": f"Failed to create MySQL database: {str(e)}"
            }

    @staticmethod
    async def _create_mongodb_native(
        database_name: str, username: str, password: str
    ) -> Dict[str, Any]:
        """Create MongoDB database on local server"""
        client = None
        try:
            client = AsyncIOMotorClient('mongodb://localhost:27017/')
            
            db_list = await client.list_database_names()
            if database_name in db_list:
                client.close()
                return {
                    "success": False,
                    "message": f"Database '{database_name}' already exists"
                }
            
            db = client[database_name]
            await db.create_collection('_init')
            
            await db.command(
                "createUser",
                username,
                pwd=password,
                roles=[{"role": "readWrite", "db": database_name}]
            )
            
            await db.drop_collection('_init')
            
            client.close()
            
            return {
                "success": True,
                "message": f"MongoDB database '{database_name}' created successfully",
                "connection_details": {
                    "host": "localhost",
                    "port": 27017,
                    "database": database_name,
                    "username": username,
                    "password": password
                }
            }
            
        except Exception as e:
            if client:
                client.close()
            return {
                "success": False,
                "message": f"Failed to create MongoDB database: {str(e)}"
            }