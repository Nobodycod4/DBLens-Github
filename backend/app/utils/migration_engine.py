"""
Migration Engine - Core logic for database migrations
Supports: MySQL, PostgreSQL, MongoDB, SQLite
Handles schema + data migration between different database types
"""
import asyncio
import aiosqlite
from typing import Dict, List, Any, Optional
from datetime import datetime
import aiomysql
import asyncpg
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import json
from decimal import Decimal

from app.utils.schema_inspector import SchemaInspector
from app.utils.data_type_mapper import DataTypeMapper


class MigrationEngine:
    """Handles database migration operations"""
    
    def __init__(self, source_config: Dict, target_config: Dict):
        self.source_config = source_config
        self.target_config = target_config
        self.source_db_type = source_config["db_type"]
        self.target_db_type = target_config["db_type"]
        self.migration_log = []
    
    async def _can_use_native_migration(self) -> bool:
        """Check if we can use native migration (same database type)"""
        return self.source_db_type == self.target_db_type
    
    async def migrate(
        self,
        selected_tables: List[str],
        drop_if_exists: bool = False,
        progress_callback = None
    ) -> Dict[str, Any]:
        """
        Perform full migration (schema + data)
        Uses native optimized migration for same-database migrations
        """
        start_time = datetime.now()
        tables_to_migrate = []
        
        try:
            self.log("🚀 Migration started")
            self.log(f"   Source: {self.source_db_type} → Target: {self.target_db_type}")
            
            if await self._can_use_native_migration():
                self.log("⚡ Using optimized native migration (same database type)")
                return await self._native_migrate(selected_tables, drop_if_exists, progress_callback)
            
            self.log("📋 Step 1/4: Fetching source schema...")
            if progress_callback:
                await progress_callback(10, "Fetching source schema")
            
            schema = await self._get_source_schema()
            if not schema["success"]:
                raise Exception(f"Failed to get schema: {schema.get('error')}")
            
            self.log("🔍 Step 2/4: Analyzing dependencies...")
            if progress_callback:
                await progress_callback(20, "Analyzing dependencies")
            
            tables_to_migrate = self._resolve_dependencies(schema["tables"], selected_tables)
            self.log(f"✓ Found {len(tables_to_migrate)} tables to migrate")
            
            self.log("🏗️  Step 3/4: Migrating schema...")
            if progress_callback:
                await progress_callback(30, "Migrating schema")
            
            await self._migrate_schema(tables_to_migrate, drop_if_exists)
            self.log("✓ Schema migration completed")
            
            self.log("📦 Step 4/4: Migrating data...")
            migrated_rows = 0
            
            for idx, table in enumerate(tables_to_migrate):
                table_progress = 40 + (50 * (idx / len(tables_to_migrate)))
                if progress_callback:
                    await progress_callback(
                        table_progress,
                        f"Migrating data: {table['name']}"
                    )
                
                rows = await self._migrate_table_data(table)
                migrated_rows += rows
                self.log(f"  ✓ {table['name']}: {rows} rows migrated")
            
            duration = (datetime.now() - start_time).total_seconds()
            self.log(f"✅ Migration completed in {duration:.2f}s")
            
            if progress_callback:
                await progress_callback(100, "Migration completed")
            
            return {
                "success": True,
                "message": "Migration completed successfully",
                "statistics": {
                    "total_tables": len(tables_to_migrate),
                    "total_rows": migrated_rows,
                    "duration_seconds": duration
                },
                "migration_log": self.migration_log
            }
            
        except Exception as e:
            self.log(f"❌ Migration failed: {str(e)}")
            
            try:
                self.log("🔄 Attempting rollback...")
                table_names = [t["name"] for t in tables_to_migrate] if tables_to_migrate else selected_tables
                await self._rollback_tables(table_names)
                self.log("✓ Rollback completed")
            except Exception as rollback_error:
                self.log(f"⚠️ Rollback failed: {str(rollback_error)}")
            
            return {
                "success": False,
                "error": str(e),
                "migration_log": self.migration_log
            }
    
    async def _native_migrate(
        self,
        selected_tables: List[str],
        drop_if_exists: bool,
        progress_callback
    ) -> Dict[str, Any]:
        """Perform native migration for same database type"""
        start_time = datetime.now()
        
        try:
            if self.source_db_type == "mysql":
                result = await self._native_migrate_mysql(selected_tables, drop_if_exists, progress_callback)
            elif self.source_db_type == "postgresql":
                result = await self._native_migrate_postgresql(selected_tables, drop_if_exists, progress_callback)
            elif self.source_db_type == "mongodb":
                result = await self._native_migrate_mongodb(selected_tables, drop_if_exists, progress_callback)
            elif self.source_db_type == "sqlite":
                result = await self._native_migrate_sqlite(selected_tables, drop_if_exists, progress_callback)
            else:
                raise Exception(f"Native migration not supported for {self.source_db_type}")
            
            duration = (datetime.now() - start_time).total_seconds()
            result["statistics"]["duration_seconds"] = duration
            
            return result
            
        except Exception as e:
            self.log(f"❌ Native migration failed: {str(e)}")
            raise
    
    async def _native_migrate_mysql(
        self,
        selected_tables: List[str],
        drop_if_exists: bool,
        progress_callback
    ) -> Dict[str, Any]:
        """Native MySQL → MySQL migration"""
        self.log("📋 Step 1/3: Fetching source schema...")
        if progress_callback:
            await progress_callback(10, "Fetching source schema")
        
        schema = await self._get_source_schema()
        if not schema["success"]:
            raise Exception(f"Failed to get schema: {schema.get('error')}")
        
        tables_to_migrate = [t for t in schema["tables"] if t["name"] in selected_tables]
        
        self.log("🏗️  Step 2/3: Migrating schema...")
        if progress_callback:
            await progress_callback(30, "Migrating schema")
        
        await self._migrate_schema_mysql(tables_to_migrate, drop_if_exists)
        
        self.log("📦 Step 3/3: Migrating data...")
        migrated_rows = 0
        
        for idx, table in enumerate(tables_to_migrate):
            table_progress = 40 + (50 * (idx / len(tables_to_migrate)))
            if progress_callback:
                await progress_callback(table_progress, f"Migrating data: {table['name']}")
            
            rows = await self._migrate_table_data(table)
            migrated_rows += rows
            self.log(f"  ✓ {table['name']}: {rows} rows migrated")
        
        self.log(f"✅ MySQL native migration completed")
        
        return {
            "success": True,
            "message": "Native MySQL migration completed successfully",
            "statistics": {
                "total_tables": len(tables_to_migrate),
                "total_rows": migrated_rows,
                "duration_seconds": 0
            },
            "migration_log": self.migration_log
        }
    
    async def _native_migrate_postgresql(
        self,
        selected_tables: List[str],
        drop_if_exists: bool,
        progress_callback
    ) -> Dict[str, Any]:
        """Native PostgreSQL → PostgreSQL migration"""
        self.log("📋 Step 1/3: Fetching source schema...")
        if progress_callback:
            await progress_callback(10, "Fetching source schema")
        
        schema = await self._get_source_schema()
        if not schema["success"]:
            raise Exception(f"Failed to get schema: {schema.get('error')}")
        
        tables_to_migrate = [t for t in schema["tables"] if t["name"] in selected_tables]
        
        self.log("🏗️  Step 2/3: Migrating schema...")
        if progress_callback:
            await progress_callback(30, "Migrating schema")
        
        await self._migrate_schema_postgresql(tables_to_migrate, drop_if_exists)
        
        self.log("📦 Step 3/3: Migrating data...")
        migrated_rows = 0
        
        for idx, table in enumerate(tables_to_migrate):
            table_progress = 40 + (50 * (idx / len(tables_to_migrate)))
            if progress_callback:
                await progress_callback(table_progress, f"Migrating data: {table['name']}")
            
            rows = await self._migrate_table_data(table)
            migrated_rows += rows
            self.log(f"  ✓ {table['name']}: {rows} rows migrated")
        
        self.log(f"✅ PostgreSQL native migration completed")
        
        return {
            "success": True,
            "message": "Native PostgreSQL migration completed successfully",
            "statistics": {
                "total_tables": len(tables_to_migrate),
                "total_rows": migrated_rows,
                "duration_seconds": 0
            },
            "migration_log": self.migration_log
        }
    
    async def _native_migrate_mongodb(
        self,
        selected_tables: List[str],
        drop_if_exists: bool,
        progress_callback
    ) -> Dict[str, Any]:
        """Native MongoDB → MongoDB migration"""
        self.log("📋 Step 1/3: Fetching source collections...")
        if progress_callback:
            await progress_callback(10, "Fetching source collections")
        
        schema = await self._get_source_schema()
        if not schema["success"]:
            raise Exception(f"Failed to get schema: {schema.get('error')}")
        
        collections_to_migrate = [t for t in schema["tables"] if t["name"] in selected_tables]
        
        self.log("🏗️  Step 2/3: Creating collections...")
        if progress_callback:
            await progress_callback(30, "Creating collections")
        
        await self._migrate_schema_mongodb(collections_to_migrate, drop_if_exists)
        
        self.log("📦 Step 3/3: Migrating documents...")
        migrated_docs = 0
        
        for idx, collection in enumerate(collections_to_migrate):
            table_progress = 40 + (50 * (idx / len(collections_to_migrate)))
            if progress_callback:
                await progress_callback(table_progress, f"Migrating documents: {collection['name']}")
            
            rows = await self._migrate_table_data(collection)
            migrated_docs += rows
            self.log(f"  ✓ {collection['name']}: {rows} documents migrated")
        
        self.log(f"✅ MongoDB native migration completed")
        
        return {
            "success": True,
            "message": "Native MongoDB migration completed successfully",
            "statistics": {
                "total_tables": len(collections_to_migrate),
                "total_rows": migrated_docs,
                "duration_seconds": 0
            },
            "migration_log": self.migration_log
        }
    
    async def _native_migrate_sqlite(
        self,
        selected_tables: List[str],
        drop_if_exists: bool,
        progress_callback
    ) -> Dict[str, Any]:
        """Native SQLite → SQLite migration"""
        self.log("📋 Step 1/3: Fetching source schema...")
        if progress_callback:
            await progress_callback(10, "Fetching source schema")
        
        schema = await self._get_source_schema()
        if not schema["success"]:
            raise Exception(f"Failed to get schema: {schema.get('error')}")
        
        tables_to_migrate = [
            t for t in schema["tables"] 
            if t["name"] in selected_tables and t["name"] != "sqlite_sequence"
        ]
        
        self.log("🏗️  Step 2/3: Migrating schema...")
        if progress_callback:
            await progress_callback(30, "Migrating schema")
        
        await self._migrate_schema_sqlite(tables_to_migrate, drop_if_exists)
        
        self.log("📦 Step 3/3: Migrating data...")
        migrated_rows = 0
        
        for idx, table in enumerate(tables_to_migrate):
            table_progress = 40 + (50 * (idx / len(tables_to_migrate)))
            if progress_callback:
                await progress_callback(table_progress, f"Migrating data: {table['name']}")
            
            rows = await self._migrate_table_data(table)
            migrated_rows += rows
            self.log(f"  ✓ {table['name']}: {rows} rows migrated")
        
        self.log(f"✅ SQLite native migration completed")
        
        return {
            "success": True,
            "message": "Native SQLite migration completed successfully",
            "statistics": {
                "total_tables": len(tables_to_migrate),
                "total_rows": migrated_rows,
                "duration_seconds": 0
            },
            "migration_log": self.migration_log
        }
    
    async def _get_source_schema(self) -> Dict:
        """Get schema from source database"""
        return await SchemaInspector.get_schema(
            db_type=self.source_db_type,
            host=self.source_config["host"],
            port=self.source_config["port"],
            database=self.source_config["database_name"],
            username=self.source_config.get("username"),
            password=self.source_config.get("password"),
            ssl_enabled=self.source_config.get("ssl_enabled", False)
        )
    
    def _resolve_dependencies(
        self,
        all_tables: List[Dict],
        selected_tables: List[str]
    ) -> List[Dict]:
        """
        Resolve foreign key dependencies and order tables for migration
        Auto-selects dependent tables (for relational DBs)
        """
        SQLITE_INTERNAL_TABLES = {'sqlite_sequence', 'sqlite_stat1', 'sqlite_stat2', 
                                  'sqlite_stat3', 'sqlite_stat4', 'sqlite_master'}
        
        filtered_tables = [
            t for t in all_tables 
            if t["name"] not in SQLITE_INTERNAL_TABLES
        ]
        

        if self.source_db_type == "mongodb":
            MONGO_SYSTEM_COLLECTIONS = {'system.users', 'system.version', 'system.indexes', 'system.profile'}
            filtered_tables = [t for t in filtered_tables if t["name"] not in MONGO_SYSTEM_COLLECTIONS]
            skipped = [t["name"] for t in all_tables if t["name"] in MONGO_SYSTEM_COLLECTIONS]
            if skipped:
                self.log(f"  ℹ️  Skipped MongoDB system collections: {', '.join(skipped)}")
        
        table_map = {t["name"]: t for t in filtered_tables}
        dependencies = {}
        
        if self.source_db_type != "mongodb":
            for table in filtered_tables:
                deps = set()
                for fk in table.get("foreign_keys", []):
                    ref_table = fk.get("references_table")
                    if ref_table and ref_table != table["name"] and ref_table not in SQLITE_INTERNAL_TABLES:
                        deps.add(ref_table)
                dependencies[table["name"]] = deps
        else:
            for table in filtered_tables:
                dependencies[table["name"]] = set()
        
        tables_to_include = set(
            t for t in selected_tables 
            if t not in SQLITE_INTERNAL_TABLES
        )
        
        def add_dependencies(table_name):
            if table_name in dependencies:
                for dep in dependencies[table_name]:
                    if dep not in tables_to_include and dep in table_map:
                        tables_to_include.add(dep)
                        self.log(f"  + Auto-selected dependent table: {dep}")
                        add_dependencies(dep)
        
        for table_name in list(tables_to_include):
            add_dependencies(table_name)
        
        ordered = []
        visited = set()
        
        def visit(table_name):
            if table_name in visited:
                return
            visited.add(table_name)
            
            if table_name in dependencies:
                for dep in dependencies[table_name]:
                    if dep in tables_to_include:
                        visit(dep)
            
            ordered.append(table_name)
        
        for table_name in tables_to_include:
            visit(table_name)
        
        return [table_map[name] for name in ordered if name in table_map]
    
    async def _migrate_schema(
        self,
        tables: List[Dict],
        drop_if_exists: bool
    ):
        """Migrate schema based on target DB type"""
        if self.target_db_type == "postgresql":
            await self._migrate_schema_postgresql(tables, drop_if_exists)
        elif self.target_db_type == "mysql":
            await self._migrate_schema_mysql(tables, drop_if_exists)
        elif self.target_db_type == "mongodb":
            await self._migrate_schema_mongodb(tables, drop_if_exists)
        elif self.target_db_type == "sqlite":
            await self._migrate_schema_sqlite(tables, drop_if_exists)
        else:
            raise Exception(f"Unsupported target database: {self.target_db_type}")
    
    async def _migrate_schema_postgresql(
        self,
        tables: List[Dict],
        drop_if_exists: bool
    ):
        """Migrate schema to PostgreSQL with proper FK handling"""
        conn = None
        try:
            conn = await asyncpg.connect(
                host=self.target_config["host"],
                port=self.target_config["port"],
                user=self.target_config["username"],
                password=self.target_config["password"],
                database=self.target_config["database_name"]
            )
        
            try:
                username = self.target_config["username"]
                await conn.execute(f'GRANT CREATE ON SCHEMA public TO "{username}"')
                await conn.execute(f'GRANT ALL ON SCHEMA public TO "{username}"')
                await conn.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "{username}"')
                self.log(f"  ✓ Granted schema permissions to {username}")
            except Exception as perm_error:
                self.log(f"  ⚠️  Permission grant skipped: {str(perm_error)}")
        
            async with conn.transaction():
                await conn.execute("SET search_path TO public")
            
                for table in tables:
                    table_name = table["name"]
                
                    if drop_if_exists:
                        await conn.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
                        self.log(f"  - Dropped existing table: {table_name}")
                
                    create_sql = DataTypeMapper.get_create_table_sql(
                        table_name=table_name,
                        columns=table["columns"],
                        primary_keys=table.get("primary_keys", []),
                        source_db=self.source_db_type,
                        target_db="postgresql"
                    )
                
                    await conn.execute(create_sql)
                    self.log(f"  ✓ Created table: {table_name}")
            
                if self.source_db_type != "mongodb":
                    total_fks = sum(len(t.get("foreign_keys", [])) for t in tables)
                    if total_fks:
                        self.log(f"  🔗 Adding {total_fks} foreign key constraint(s)...")
                    for table in tables:
                        table_name = table["name"]
                        for fk in table.get("foreign_keys", []):
                            ref_table = fk.get("references_table") or fk.get("referenced_table")
                            ref_col = fk.get("references_column") or fk.get("referenced_column")
                            fk_col = fk.get("column_name") or fk.get("column")
                            if not ref_table or not ref_col or not fk_col:
                                continue
                            fk_name = f"fk_{table_name}_{fk_col}_ref_{ref_table}"[:63]
                            try:
                                fk_sql = f'''
                                    ALTER TABLE "{table_name}"
                                    ADD CONSTRAINT "{fk_name}"
                                    FOREIGN KEY ("{fk_col}")
                                    REFERENCES "{ref_table}" ("{ref_col}")
                                '''
                                await conn.execute(fk_sql)
                                self.log(f"  ✓ Created FK: {table_name}.{fk_col} → {ref_table}.{ref_col}")
                            except Exception as fk_error:
                                self.log(f"  ⚠️  FK failed: {fk_name} - {str(fk_error)}")
    
        finally:
            if conn:
                await conn.close()

    async def _migrate_schema_mysql(
        self,
        tables: List[Dict],
        drop_if_exists: bool
    ):
        """Migrate schema to MySQL with proper FK handling"""
        conn = None
        try:
            conn = await aiomysql.connect(
                host=self.target_config["host"],
                port=self.target_config["port"],
                user=self.target_config["username"],
                password=self.target_config["password"],
                db=self.target_config["database_name"],
                charset='utf8mb4'
            )
            
            if drop_if_exists:
                async with conn.cursor() as cursor:
                    await cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
                    for table in tables:
                        await cursor.execute(f"DROP TABLE IF EXISTS `{table['name']}`")
                        self.log(f"  - Dropped existing table: {table['name']}")
                    await cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
                    await conn.commit()
            
            async with conn.cursor() as cursor:
                for table in tables:
                    table_name = table["name"]
                    
                    create_sql = DataTypeMapper.get_create_table_sql(
                        table_name=table_name,
                        columns=table["columns"],
                        primary_keys=table.get("primary_keys", []),
                        source_db=self.source_db_type,
                        target_db="mysql"
                    )
                    
                    await cursor.execute(create_sql)
                    self.log(f"  ✓ Created table: {table_name}")
                
                await conn.commit()
            
            if self.source_db_type != "mongodb":
                total_fks = sum(len(t.get("foreign_keys", [])) for t in tables)
                if total_fks:
                    self.log(f"  🔗 Adding {total_fks} foreign key constraint(s)...")
                async with conn.cursor() as cursor:
                    await cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
                    for table in tables:
                        table_name = table["name"]
                        for fk in table.get("foreign_keys", []):
                            ref_table = fk.get("references_table") or fk.get("referenced_table")
                            ref_col = fk.get("references_column") or fk.get("referenced_column")
                            fk_col = fk.get("column_name") or fk.get("column")
                            if not ref_table or not ref_col or not fk_col:
                                continue
                            fk_name = f"fk_{table_name}_{fk_col}_ref_{ref_table}"[:64]
                            try:
                                fk_sql = f'''
                                    ALTER TABLE `{table_name}`
                                    ADD CONSTRAINT `{fk_name}`
                                    FOREIGN KEY (`{fk_col}`)
                                    REFERENCES `{ref_table}` (`{ref_col}`)
                                '''
                                await cursor.execute(fk_sql)
                                self.log(f"  ✓ Created FK: {table_name}.{fk_col} → {ref_table}.{ref_col}")
                            except Exception as fk_error:
                                self.log(f"  ⚠️ FK failed: {fk_name} - {str(fk_error)}")
                    await cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
                    await conn.commit()
        
        finally:
            if conn:
                conn.close()

    def _build_mongodb_connection_string(self, config: Dict) -> str:
        """
        Build MongoDB connection string with proper password handling.
        When using username/password, sets authSource to the target database so MongoDB
        authenticates against the DB where the user was created (e.g. by createUser in that DB).
        """
        host = config["host"]
        port = config["port"]
        username = config.get("username", "") or ""
        password = config.get("password", "") or ""
        db_name = config.get("database_name") or config.get("database") or ""

        from urllib.parse import quote_plus

        if username and password:
            encoded_password = quote_plus(password)
            encoded_username = quote_plus(username)
            base = f"mongodb://{encoded_username}:{encoded_password}@{host}:{port}"
            if db_name:
                encoded_db = quote_plus(db_name)
                return f"{base}/{encoded_db}?authSource={encoded_db}"
            return base

        elif username:
            return f"mongodb://{quote_plus(username)}@{host}:{port}"

        return f"mongodb://{host}:{port}"
    
    async def _migrate_schema_mongodb(
        self,
        tables: List[Dict],
        drop_if_exists: bool
    ):
        """Migrate schema to MongoDB (schemaless, but create collections)"""
        client = None
        try:
            conn_str = self._build_mongodb_connection_string(self.target_config)
        
            self.log(f"  Connecting to MongoDB: {self.target_config['host']}:{self.target_config['port']}")
        
            client = AsyncIOMotorClient(conn_str)
            db = client[self.target_config["database_name"]]
        
            for table in tables:
                collection_name = table["name"]
            
                existing_collections = await db.list_collection_names()
            
                if collection_name in existing_collections:
                    if drop_if_exists:
                        await db[collection_name].drop()
                        self.log(f"  - Dropped existing collection: {collection_name}")
                    else:
                        self.log(f"  ⚠️  Collection exists: {collection_name} (skipping)")
                        continue
            
                await db.create_collection(collection_name)
                self.log(f"  ✓ Created collection: {collection_name}")
            
                if table.get("primary_keys"):
                    pks = [pk for pk in table["primary_keys"] if pk != "_id"]
                    if pks:
                        index_fields = [(pk, 1) for pk in pks]
                        await db[collection_name].create_index(index_fields, unique=True)
                        self.log(f"    + Created unique index on: {', '.join(pks)}")
            
            if self.source_db_type != "mongodb":
                rel_coll_name = "_dblens_relationships"
                if rel_coll_name in await db.list_collection_names():
                    await db[rel_coll_name].drop()
                await db.create_collection(rel_coll_name)
                count = 0
                for table in tables:
                    for fk in table.get("foreign_keys", []):
                        ref_table = fk.get("references_table") or fk.get("referenced_table")
                        ref_col = fk.get("references_column") or fk.get("referenced_column")
                        col = fk.get("column_name") or fk.get("column")
                        if ref_table and ref_col and col:
                            await db[rel_coll_name].insert_one({
                                "from_collection": table["name"],
                                "from_field": col,
                                "to_collection": ref_table,
                                "to_field": ref_col,
                            })
                            count += 1
                if count:
                    self.log(f"  🔗 Stored {count} relationship(s) in {rel_coll_name} (for Schema Diagram)")
    
        finally:
            if client:
                client.close()
    
    async def _migrate_schema_sqlite(
        self,
        tables: List[Dict],
        drop_if_exists: bool
    ):
        """Migrate schema to SQLite including primary keys and foreign keys for Schema Diagram."""
        db_path = self._resolve_sqlite_path(self.target_config, must_exist=False)
        
        self.log(f"  📂 Creating/updating SQLite database: {db_path}")
        
        async with aiosqlite.connect(db_path) as conn:
            await conn.execute("PRAGMA foreign_keys = OFF")  # Off during creation; FKs still stored for Schema Diagram
            
            for table in tables:
                table_name = table["name"]
                
                if drop_if_exists:
                    await conn.execute(f"DROP TABLE IF EXISTS `{table_name}`")
                    self.log(f"  - Dropped existing table: {table_name}")
                
                col_defs = []
                
                for col in table["columns"]:
                    col_name = col.get("name", col.get("column_name", "unknown"))
                    source_type = DataTypeMapper.get_column_data_type(col)
                    col_type = DataTypeMapper.map_to_sqlite(source_type, self.source_db_type)
                    
                    col_def = f"`{col_name}` {col_type}"
                    
                    if not col.get("is_nullable", True):
                        col_def += " NOT NULL"
                    
                    col_defs.append(col_def)
                
                if table.get("primary_keys"):
                    pk_cols = ", ".join(f"`{pk}`" for pk in table["primary_keys"])
                    col_defs.append(f"PRIMARY KEY ({pk_cols})")
                
                for fk in table.get("foreign_keys", []):
                    col_fk = fk.get("column") or fk.get("column_name")
                    ref_table = fk.get("references_table") or fk.get("referenced_table")
                    ref_col = fk.get("references_column") or fk.get("referenced_column")
                    if col_fk and ref_table and ref_col:
                        col_defs.append(
                            f"FOREIGN KEY (`{col_fk}`) REFERENCES `{ref_table}`(`{ref_col}`)"
                        )
                
                create_sql = f"CREATE TABLE `{table_name}` (\n  " + ",\n  ".join(col_defs) + "\n)"
                
                await conn.execute(create_sql)
                fk_count = len(table.get("foreign_keys", []))
                self.log(f"  ✓ Created table: {table_name}" + (f" ({fk_count} FK(s))" if fk_count else ""))
            
            await conn.commit()
            self.log(f"  ✓ Schema committed to database")
    
    async def _migrate_table_data(self, table: Dict) -> int:
        """Migrate data for a single table"""
        table_name = table["name"]
        columns = [col["name"] for col in table["columns"]]
        
        self.log(f"  📊 Fetching data from {self.source_db_type} source: {table_name}")
        
        rows = await self._fetch_source_data(table_name, columns)
        
        if not rows:
            self.log(f"  ℹ️  No data found in {table_name}")
            return 0
        
        self.log(f"  ✓ Fetched {len(rows)} rows from source")
        
        rows = self._convert_data_for_target(rows, columns)
        
        self.log(f"  💾 Inserting into {self.target_db_type} target: {table_name}")
        
        await self._insert_target_data(table_name, columns, rows, table)
        
        return len(rows)
    
    def _convert_data_for_target(self, rows: List, columns: List[str]) -> List:
        """Convert data types based on source/target database types"""
        from datetime import date, time
        from bson import Binary
        import base64
        import uuid
        
        if self.source_db_type == "mongodb" and self.target_db_type != "mongodb":
            converted_rows = []
            for doc in rows:
                row_list = []
                for col in columns:
                    val = doc.get(col)
                    
                    if isinstance(val, ObjectId):
                        val = str(val)
                    
                    elif isinstance(val, Binary):
                        val = base64.b64encode(bytes(val)).decode('utf-8')
                    
                    elif isinstance(val, (dict, list)):
                        val = json.dumps(val)
                    
                    elif isinstance(val, datetime):
                        val = val.isoformat()
                    
                    elif isinstance(val, date):
                        val = datetime.combine(val, time.min).isoformat()
                    
                    row_list.append(val)
                converted_rows.append(tuple(row_list))
            return converted_rows
        
        elif self.source_db_type != "mongodb" and self.target_db_type == "mongodb":
            converted_docs = []
            for row in rows:
                doc = {}
                for i, col_name in enumerate(columns):
                    val = row[i]
                    if isinstance(val, Decimal):
                        val = float(val)
                    elif isinstance(val, datetime):
                        val = val.isoformat()
                    elif isinstance(val, date):
                        val = datetime.combine(val, time.min).isoformat()
                    elif isinstance(val, time):
                        val = val.isoformat()
                    doc[col_name] = val
                converted_docs.append(doc)
            return converted_docs
        
        elif self.source_db_type == "sqlite" and self.target_db_type in ("mysql", "postgresql"):
            converted_rows = []
            for row in rows:
                row_list = []
                for val in row:
                    if isinstance(val, (bytes, bytearray, memoryview)):
                        byte_data = bytes(val) if not isinstance(val, bytes) else val
                        
                        if len(byte_data) == 16:
                            try:
                                uuid_val = uuid.UUID(bytes=byte_data)
                                val = str(uuid_val)
                            except (ValueError, TypeError):
                                try:
                                    decoded = byte_data.decode('ascii')
                                    if decoded.isprintable():
                                        val = decoded
                                    else:
                                        val = base64.b64encode(byte_data).decode('ascii')
                                except (UnicodeDecodeError, ValueError):
                                    val = base64.b64encode(byte_data).decode('ascii')
                        else:
                            try:
                                decoded = byte_data.decode('ascii')
                                if decoded.isprintable():
                                    val = decoded
                                else:
                                    val = base64.b64encode(byte_data).decode('ascii')
                            except (UnicodeDecodeError, ValueError):
                                try:
                                    decoded = byte_data.decode('utf-8')
                                    if sum(1 for c in decoded if c.isprintable()) / max(len(decoded), 1) > 0.8:
                                        val = decoded
                                    else:
                                        val = base64.b64encode(byte_data).decode('ascii')
                                except UnicodeDecodeError:
                                    val = base64.b64encode(byte_data).decode('ascii')
                    
                    elif isinstance(val, Decimal):
                        val = float(val)
                    
                    elif isinstance(val, datetime):
                        val = val.isoformat()
                    
                    elif isinstance(val, date):
                        val = datetime.combine(val, time.min).isoformat()
                    
                    elif isinstance(val, str):
                        val = val.replace('\x00', '')
                        try:
                            val.encode('utf-8')
                        except UnicodeEncodeError:
                            try:
                                val = val.encode('latin-1').decode('utf-8', errors='replace')
                            except:
                                val = val.encode('utf-8', errors='replace').decode('utf-8')
                    
                    row_list.append(val)
                converted_rows.append(tuple(row_list))
            return converted_rows
        
        return rows

    async def _fetch_source_data(self, table_name: str, columns: List[str]) -> List:
        """Fetch all data from source table/collection"""
        if self.source_db_type == "postgresql":
            return await self._fetch_postgresql(table_name, columns)
        elif self.source_db_type == "mysql":
            return await self._fetch_mysql(table_name, columns)
        elif self.source_db_type == "mongodb":
            return await self._fetch_mongodb(table_name)
        elif self.source_db_type == "sqlite":
            return await self._fetch_sqlite(table_name, columns)
        else:
            raise Exception(f"Unsupported source database: {self.source_db_type}")
    
    async def _fetch_postgresql(self, table_name: str, columns: List[str]) -> List[tuple]:
        """Fetch data from PostgreSQL"""
        conn = None
        try:
            conn = await asyncpg.connect(
                host=self.source_config["host"],
                port=self.source_config["port"],
                user=self.source_config["username"],
                password=self.source_config["password"],
                database=self.source_config["database_name"]
            )
            
            col_names = ", ".join(f'"{col}"' for col in columns)
            query = f'SELECT {col_names} FROM "{table_name}"'
            
            rows = await conn.fetch(query)
            return [tuple(row) for row in rows]
            
        finally:
            if conn:
                await conn.close()
    
    async def _fetch_mysql(self, table_name: str, columns: List[str]) -> List[tuple]:
        """Fetch data from MySQL"""
        conn = None
        try:
            conn = await aiomysql.connect(
                host=self.source_config["host"],
                port=self.source_config["port"],
                user=self.source_config["username"],
                password=self.source_config["password"],
                db=self.source_config["database_name"],
                charset='utf8mb4'
            )
            
            async with conn.cursor() as cursor:
                col_names = ", ".join(f"`{col}`" for col in columns)
                query = f"SELECT {col_names} FROM `{table_name}`"
                
                await cursor.execute(query)
                rows = await cursor.fetchall()
                return rows
            
        finally:
            if conn:
                conn.close()
    
    async def _fetch_mongodb(self, collection_name: str) -> List[Dict]:
        """Fetch data from MongoDB"""
        client = None
        try:
            conn_str = self._build_mongodb_connection_string(self.source_config)
        
            client = AsyncIOMotorClient(conn_str)
            db = client[self.source_config["database_name"]]
        
            cursor = db[collection_name].find({})
            documents = await cursor.to_list(length=None)
        
            return documents
        
        finally:
            if client:
                client.close()

    async def _fetch_sqlite(self, table_name: str, columns: List[str]) -> List[tuple]:
        """Fetch data from SQLite"""
        db_path = self._resolve_sqlite_path(self.source_config)
        
        self.log(f"  📂 Reading from SQLite: {db_path}")
        
        async with aiosqlite.connect(db_path) as conn:
            col_names = ", ".join(f"`{col}`" for col in columns)
            query = f"SELECT {col_names} FROM `{table_name}`"
            
            async with conn.execute(query) as cursor:
                rows = await cursor.fetchall()
                return rows
    
    async def _insert_target_data(
        self,
        table_name: str,
        columns: List[str],
        rows: List,
        table_schema: Dict
    ):
        """Insert data into target database"""
        if self.target_db_type == "postgresql":
            await self._insert_postgresql(table_name, columns, rows)
        elif self.target_db_type == "mysql":
            await self._insert_mysql(table_name, columns, rows)
        elif self.target_db_type == "mongodb":
            await self._insert_mongodb(table_name, columns, rows)
        elif self.target_db_type == "sqlite":
            await self._insert_sqlite(table_name, columns, rows)
        else:
            raise Exception(f"Unsupported target database: {self.target_db_type}")
    
    async def _insert_postgresql(self, table_name: str, columns: List[str], rows: List[tuple]):
        """Insert data into PostgreSQL in batches"""
        conn = None
        try:
            conn = await asyncpg.connect(
                host=self.target_config["host"],
                port=self.target_config["port"],
                user=self.target_config["username"],
                password=self.target_config["password"],
                database=self.target_config["database_name"]
            )
            
            insert_sql = DataTypeMapper.get_insert_sql(
                table_name=table_name,
                columns=columns,
                target_db="postgresql"
            )
            
            batch_size = 1000
            async with conn.transaction():
                await conn.execute("SET CONSTRAINTS ALL DEFERRED")
                
                for i in range(0, len(rows), batch_size):
                    batch = rows[i:i + batch_size]
                    await conn.executemany(insert_sql, batch)
            
        finally:
            if conn:
                await conn.close()
    
    def _convert_value_for_mysql(self, val):
        """Convert a value to a MySQL-compatible format"""
        import uuid
        import base64
        
        if val is None:
            return None
        elif isinstance(val, (bytes, bytearray, memoryview)):
            byte_data = bytes(val) if not isinstance(val, bytes) else val
            
            if len(byte_data) == 16:
                try:
                    uuid_val = uuid.UUID(bytes=byte_data)
                    return str(uuid_val)
                except (ValueError, TypeError):
                    pass
            
            try:
                decoded = byte_data.decode('ascii')
                if decoded.isprintable():
                    return decoded
            except (UnicodeDecodeError, ValueError):
                pass
            
            try:
                decoded = byte_data.decode('utf-8')
                if sum(1 for c in decoded if c.isprintable()) / max(len(decoded), 1) > 0.8:
                    return decoded
            except UnicodeDecodeError:
                pass
            
            return base64.b64encode(byte_data).decode('ascii')
        elif isinstance(val, Decimal):
            return float(val)
        elif isinstance(val, (list, dict)):
            return json.dumps(val)
        elif isinstance(val, datetime):
            return val.isoformat()
        elif isinstance(val, bool):
            return 1 if val else 0
        elif isinstance(val, str):
            cleaned = val.replace('\x00', '')
            
            try:
                cleaned.encode('utf-8')
                return cleaned
            except UnicodeEncodeError:
                try:
                    return cleaned.encode('latin-1').decode('utf-8', errors='replace')
                except:
                    return cleaned.encode('utf-8', errors='replace').decode('utf-8')
        else:
            try:
                if hasattr(val, '__bytes__'):
                    byte_data = bytes(val)
                    return base64.b64encode(byte_data).decode('ascii')
            except:
                pass
            return val
    
    def _convert_rows_for_mysql(self, rows: List[tuple]) -> List[tuple]:
        """Convert all rows for MySQL compatibility"""
        converted_rows = []
        for row in rows:
            converted_row = tuple(self._convert_value_for_mysql(val) for val in row)
            converted_rows.append(converted_row)
        return converted_rows
    
    async def _insert_mysql(self, table_name: str, columns: List[str], rows: List[tuple]):
        """Insert data into MySQL in batches"""
        conn = None
        try:
            conn = await aiomysql.connect(
                host=self.target_config["host"],
                port=self.target_config["port"],
                user=self.target_config["username"],
                password=self.target_config["password"],
                db=self.target_config["database_name"],
                charset='utf8mb4'  # Support full Unicode including emojis and special chars
            )
            
            converted_rows = self._convert_rows_for_mysql(rows)
            
            insert_sql = DataTypeMapper.get_insert_sql(
                table_name=table_name,
                columns=columns,
                target_db="mysql"
            )
            
            batch_size = 1000
            async with conn.cursor() as cursor:
                await cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
                
                for i in range(0, len(converted_rows), batch_size):
                    batch = converted_rows[i:i + batch_size]
                    await cursor.executemany(insert_sql, batch)
                
                await cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
                await conn.commit()
        
        finally:
            if conn:
                conn.close()
    
    async def _insert_mongodb(self, collection_name: str, columns: List[str], rows: List[Dict]):
        """Insert documents into MongoDB"""
        client = None
        try:
            conn_str = self._build_mongodb_connection_string(self.target_config)
        
            client = AsyncIOMotorClient(conn_str)
            db = client[self.target_config["database_name"]]
        
            if rows:
                await db[collection_name].insert_many(rows)
    
        finally:
            if client:
                client.close()

    async def _insert_sqlite(self, table_name: str, columns: List[str], rows: List[tuple]):
        """Insert data into SQLite in batches"""
        db_path = self._resolve_sqlite_path(self.target_config, must_exist=False)
        
        self.log(f"  📂 Inserting into SQLite: {db_path}")
        
        converted_rows = []
        for row in rows:
            converted_row = []
            for val in row:
                if val is None:
                    converted_row.append(None)
                elif isinstance(val, Decimal):
                    converted_row.append(float(val))
                elif isinstance(val, (list, dict)):
                    converted_row.append(json.dumps(val))
                elif isinstance(val, datetime):
                    converted_row.append(val.isoformat())
                elif isinstance(val, bool):
                    converted_row.append(1 if val else 0)
                elif isinstance(val, (bytes, bytearray, memoryview)):
                    converted_row.append(val if isinstance(val, bytes) else bytes(val))
                else:
                    converted_row.append(val)
            converted_rows.append(tuple(converted_row))
        
        async with aiosqlite.connect(db_path) as conn:
            insert_sql = DataTypeMapper.get_insert_sql(
                table_name=table_name,
                columns=columns,
                target_db="sqlite"
            )
            
            batch_size = 1000
            for i in range(0, len(converted_rows), batch_size):
                batch = converted_rows[i:i + batch_size]
                await conn.executemany(insert_sql, batch)
            
            await conn.commit()
            self.log(f"  ✓ Inserted {len(converted_rows)} rows into {table_name}")
    
    def _resolve_sqlite_path(self, config: Dict, must_exist: bool = True) -> str:
        """Resolve SQLite database file path"""
        db_path = config.get("database_path") or config.get("host")
        
        if not db_path or db_path in ['localhost', '127.0.0.1', '0.0.0.0']:
            db_path = config.get("database_name", "database")
        
        if not db_path.endswith('.db'):
            db_path = f"{db_path}.db"
        
        if must_exist:
            import os
            if not os.path.exists(db_path):
                raise Exception(f"SQLite database file not found: {db_path}")
        
        return db_path
    
    async def _rollback_tables(self, table_names: List[str]):
        """Rollback migration by dropping created tables"""
        if self.target_db_type == "postgresql":
            await self._rollback_postgresql(table_names)
        elif self.target_db_type == "mysql":
            await self._rollback_mysql(table_names)
        elif self.target_db_type == "mongodb":
            await self._rollback_mongodb(table_names)
        elif self.target_db_type == "sqlite":
            await self._rollback_sqlite(table_names)
    
    async def _rollback_postgresql(self, table_names: List[str]):
        """Rollback PostgreSQL migration"""
        conn = None
        try:
            conn = await asyncpg.connect(
                host=self.target_config["host"],
                port=self.target_config["port"],
                user=self.target_config["username"],
                password=self.target_config["password"],
                database=self.target_config["database_name"]
            )
            
            async with conn.transaction():
                for table_name in reversed(table_names):
                    await conn.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
                    self.log(f"  ✓ Dropped table: {table_name}")
        
        finally:
            if conn:
                await conn.close()
    
    async def _rollback_mysql(self, table_names: List[str]):
        """Rollback MySQL migration"""
        conn = None
        try:
            conn = await aiomysql.connect(
                host=self.target_config["host"],
                port=self.target_config["port"],
                user=self.target_config["username"],
                password=self.target_config["password"],
                db=self.target_config["database_name"],
                charset='utf8mb4'
            )
            
            async with conn.cursor() as cursor:
                await cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
                
                for table_name in reversed(table_names):
                    await cursor.execute(f"DROP TABLE IF EXISTS `{table_name}`")
                    self.log(f"  ✓ Dropped table: {table_name}")
                
                await cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
                await conn.commit()
        
        finally:
            if conn:
                conn.close()
    
    async def _rollback_mongodb(self, collection_names: List[str]):
        """Rollback MongoDB migration"""
        client = None
        try:
            conn_str = self._build_mongodb_connection_string(self.target_config)
            
            client = AsyncIOMotorClient(conn_str)
            db = client[self.target_config["database_name"]]
            
            for collection_name in reversed(collection_names):
                await db[collection_name].drop()
                self.log(f"  ✓ Dropped collection: {collection_name}")
        
        finally:
            if client:
                client.close()
        
    async def _rollback_sqlite(self, table_names: List[str]):
        """Rollback SQLite migration"""
        db_path = self._resolve_sqlite_path(self.target_config, must_exist=False)
        
        async with aiosqlite.connect(db_path) as conn:
            for table_name in reversed(table_names):
                await conn.execute(f"DROP TABLE IF EXISTS `{table_name}`")
                self.log(f"  ✓ Dropped table: {table_name}")
            
            await conn.commit()
    
    def log(self, message: str):
        """Add message to migration log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        self.migration_log.append(log_entry)
        print(log_entry)