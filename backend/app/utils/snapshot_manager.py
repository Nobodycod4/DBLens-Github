"""
Snapshot Manager - Handles snapshot creation and restoration
Place this file at: backend/app/utils/snapshot_manager.py
"""
import os
import json
import gzip
import shutil
import subprocess
from datetime import datetime
from typing import Dict, Optional, List
from app.utils.schema_inspector import SchemaInspector


class SnapshotManager:
    """Handle database snapshot operations"""
    
    SNAPSHOT_DIR = "./snapshots"
    
    @classmethod
    def ensure_snapshot_dir(cls):
        """Create snapshots directory if it doesn't exist"""
        if not os.path.exists(cls.SNAPSHOT_DIR):
            os.makedirs(cls.SNAPSHOT_DIR)
    
    @classmethod
    def generate_filename(cls, connection_id: int, db_name: str, snapshot_type: str) -> str:
        """Generate snapshot filename with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        type_suffix = "schema" if snapshot_type == "schema_only" else "full"
        return f"snapshot_conn_{connection_id}_{db_name}_{type_suffix}_{timestamp}.sql.gz"
    
    @classmethod
    async def create_snapshot(
        cls,
        connection_config: Dict,
        snapshot_type: str = "full",
        progress_callback = None
    ) -> Dict:
        """
        Create database snapshot
        
        Args:
            connection_config: Database connection details
            snapshot_type: "full" or "schema_only"
            progress_callback: Optional async function for progress updates
        
        Returns:
            Dict with success status, file info, and metadata
        """
        cls.ensure_snapshot_dir()
        db_type = connection_config["db_type"]
        
        try:
            if progress_callback:
                await progress_callback(10, "Starting snapshot creation")
            
            if db_type == "postgresql":
                result = await cls._create_postgresql_snapshot(
                    connection_config, snapshot_type, progress_callback
                )
            elif db_type == "mysql":
                result = await cls._create_mysql_snapshot(
                    connection_config, snapshot_type, progress_callback
                )
            elif db_type == "mongodb":
                result = await cls._create_mongodb_snapshot(
                    connection_config, snapshot_type, progress_callback
                )
            elif db_type == "sqlite":
                result = await cls._create_sqlite_snapshot(
                    connection_config, snapshot_type, progress_callback
                )
            else:
                raise Exception(f"Unsupported database type: {db_type}")
            
            if progress_callback:
                await progress_callback(100, "Snapshot completed")
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }
    
    @classmethod
    async def _create_postgresql_snapshot(
        cls,
        connection_config: Dict,
        snapshot_type: str,
        progress_callback
    ) -> Dict:
        """Create PostgreSQL snapshot using pg_dump"""
        try:
            filename = cls.generate_filename(
                connection_config['connection_id'],
                connection_config['database_name'],
                snapshot_type
            )
            sql_file = os.path.join(cls.SNAPSHOT_DIR, filename.replace('.gz', ''))
            gz_file = os.path.join(cls.SNAPSHOT_DIR, filename)
            
            env = os.environ.copy()
            env['PGPASSWORD'] = connection_config['password']
            
            cmd = [
                'pg_dump',
                '-h', connection_config['host'],
                '-p', str(connection_config['port']),
                '-U', connection_config['username'],
                '-d', connection_config['database_name'],
                '-F', 'p',
            ]
            
            if snapshot_type == "schema_only":
                cmd.append('--schema-only')
            
            if progress_callback:
                await progress_callback(30, "Dumping database")
            
            start_time = datetime.now()
            
            with open(sql_file, 'w') as f:
                result = subprocess.run(
                    cmd,
                    stdout=f,
                    stderr=subprocess.PIPE,
                    text=True,
                    env=env
                )
            
            if result.returncode != 0:
                raise Exception(f"pg_dump failed: {result.stderr}")
            
            if progress_callback:
                await progress_callback(60, "Compressing snapshot")
            
            with open(sql_file, 'rb') as f_in:
                with gzip.open(gz_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            os.remove(sql_file)
            
            if progress_callback:
                await progress_callback(80, "Collecting metadata")
            
            schema_metadata = await cls._get_schema_metadata(connection_config)
            
            duration = (datetime.now() - start_time).total_seconds()
            file_size_mb = os.path.getsize(gz_file) / (1024 * 1024)
            
            return {
                'success': True,
                'filename': filename,
                'file_path': gz_file,
                'file_size_mb': round(file_size_mb, 2),
                'duration_seconds': round(duration, 2),
                'schema_metadata': schema_metadata
            }
            
        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }
    
    @classmethod
    async def _create_mysql_snapshot(
        cls,
        connection_config: Dict,
        snapshot_type: str,
        progress_callback
    ) -> Dict:
        """Create MySQL snapshot using mysqldump"""
        try:
            filename = cls.generate_filename(
                connection_config['connection_id'],
                connection_config['database_name'],
                snapshot_type
            )
            sql_file = os.path.join(cls.SNAPSHOT_DIR, filename.replace('.gz', ''))
            gz_file = os.path.join(cls.SNAPSHOT_DIR, filename)
            
            cmd = [
                'mysqldump',
                '-h', connection_config['host'],
                '-P', str(connection_config['port']),
                '-u', connection_config['username'],
                f"-p{connection_config['password']}",
            ]
            
            if snapshot_type == "schema_only":
                cmd.append('--no-data')
            
            cmd.append(connection_config['database_name'])
            
            if progress_callback:
                await progress_callback(30, "Dumping database")
            
            start_time = datetime.now()
            
            with open(sql_file, 'w') as f:
                result = subprocess.run(
                    cmd,
                    stdout=f,
                    stderr=subprocess.PIPE,
                    text=True
                )
            
            if result.returncode != 0:
                raise Exception(f"mysqldump failed: {result.stderr}")
            
            if progress_callback:
                await progress_callback(60, "Compressing snapshot")
            
            with open(sql_file, 'rb') as f_in:
                with gzip.open(gz_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            os.remove(sql_file)
            
            if progress_callback:
                await progress_callback(80, "Collecting metadata")
            
            schema_metadata = await cls._get_schema_metadata(connection_config)
            
            duration = (datetime.now() - start_time).total_seconds()
            file_size_mb = os.path.getsize(gz_file) / (1024 * 1024)
            
            return {
                'success': True,
                'filename': filename,
                'file_path': gz_file,
                'file_size_mb': round(file_size_mb, 2),
                'duration_seconds': round(duration, 2),
                'schema_metadata': schema_metadata
            }
            
        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }
    
    @classmethod
    async def _create_mongodb_snapshot(
        cls,
        connection_config: Dict,
        snapshot_type: str,
        progress_callback
    ) -> Dict:
        """Create MongoDB snapshot using mongodump"""
        try:
            filename = cls.generate_filename(
                connection_config['connection_id'],
                connection_config['database_name'],
                snapshot_type
            )
            backup_dir = os.path.join(cls.SNAPSHOT_DIR, f"mongo_temp_{connection_config['connection_id']}")
            gz_file = os.path.join(cls.SNAPSHOT_DIR, filename)
            
            cmd = [
                'mongodump',
                '--host', connection_config['host'],
                '--port', str(connection_config['port']),
                '--db', connection_config['database_name'],
                '--out', backup_dir
            ]
            
            if connection_config.get('username'):
                cmd.extend(['-u', connection_config['username']])
            if connection_config.get('password'):
                cmd.extend(['-p', connection_config['password']])
            
            
            if progress_callback:
                await progress_callback(30, "Dumping database")
            
            start_time = datetime.now()
            
            result = subprocess.run(
                cmd,
                stderr=subprocess.PIPE,
                text=True
            )
            
            if result.returncode != 0:
                raise Exception(f"mongodump failed: {result.stderr}")
            
            if progress_callback:
                await progress_callback(60, "Compressing snapshot")
            
            shutil.make_archive(backup_dir, 'gztar', backup_dir)
            os.rename(f"{backup_dir}.tar.gz", gz_file)
            shutil.rmtree(backup_dir)
            
            if progress_callback:
                await progress_callback(80, "Collecting metadata")
            
            schema_metadata = await cls._get_schema_metadata(connection_config)
            
            duration = (datetime.now() - start_time).total_seconds()
            file_size_mb = os.path.getsize(gz_file) / (1024 * 1024)
            
            return {
                'success': True,
                'filename': filename,
                'file_path': gz_file,
                'file_size_mb': round(file_size_mb, 2),
                'duration_seconds': round(duration, 2),
                'schema_metadata': schema_metadata
            }
            
        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }
    
    @classmethod
    async def _create_sqlite_snapshot(
        cls,
        connection_config: Dict,
        snapshot_type: str,
        progress_callback
    ) -> Dict:
        """Create SQLite snapshot using file copy"""
        try:
            import aiosqlite
            
            filename = cls.generate_filename(
                connection_config['connection_id'],
                os.path.basename(connection_config['database_name']),
                snapshot_type
            )
            gz_file = os.path.join(cls.SNAPSHOT_DIR, filename)
            
            db_path = connection_config['database_name']
            
            if not os.path.exists(db_path):
                raise Exception(f"SQLite database file not found: {db_path}")
            
            if progress_callback:
                await progress_callback(30, "Copying database")
            
            start_time = datetime.now()
            
            temp_copy = os.path.join(cls.SNAPSHOT_DIR, f"temp_{filename.replace('.gz', '')}")
            
            async with aiosqlite.connect(db_path) as source:
                async with aiosqlite.connect(temp_copy) as dest:
                    await source.backup(dest)
            
            if progress_callback:
                await progress_callback(60, "Compressing snapshot")
            
            with open(temp_copy, 'rb') as f_in:
                with gzip.open(gz_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            os.remove(temp_copy)
            
            if progress_callback:
                await progress_callback(80, "Collecting metadata")
            
            schema_metadata = await cls._get_schema_metadata(connection_config)
            
            duration = (datetime.now() - start_time).total_seconds()
            file_size_mb = os.path.getsize(gz_file) / (1024 * 1024)
            
            return {
                'success': True,
                'filename': filename,
                'file_path': gz_file,
                'file_size_mb': round(file_size_mb, 2),
                'duration_seconds': round(duration, 2),
                'schema_metadata': schema_metadata
            }
            
        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }
    
    @classmethod
    async def restore_snapshot(
        cls,
        snapshot_path: str,
        connection_config: Dict,
        progress_callback = None
    ) -> Dict:
        """
        Restore database from snapshot
        
        Args:
            snapshot_path: Path to snapshot file
            connection_config: Database connection details
            progress_callback: Optional async function for progress updates
        
        Returns:
            Dict with success status and duration
        """
        db_type = connection_config["db_type"]
        
        try:
            if progress_callback:
                await progress_callback(10, "Starting restore")
            
            if db_type == "postgresql":
                result = await cls._restore_postgresql_snapshot(
                    snapshot_path, connection_config, progress_callback
                )
            elif db_type == "mysql":
                result = await cls._restore_mysql_snapshot(
                    snapshot_path, connection_config, progress_callback
                )
            elif db_type == "mongodb":
                result = await cls._restore_mongodb_snapshot(
                    snapshot_path, connection_config, progress_callback
                )
            elif db_type == "sqlite":
                result = await cls._restore_sqlite_snapshot(
                    snapshot_path, connection_config, progress_callback
                )
            else:
                raise Exception(f"Unsupported database type: {db_type}")
            
            if progress_callback:
                await progress_callback(100, "Restore completed")
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }
    
    @classmethod
    async def _restore_postgresql_snapshot(
        cls,
        snapshot_path: str,
        connection_config: Dict,
        progress_callback
    ) -> Dict:
        """Restore PostgreSQL from snapshot"""
        try:
            if progress_callback:
                await progress_callback(20, "Decompressing snapshot")
            
            sql_file = snapshot_path.replace('.gz', '')
            
            with gzip.open(snapshot_path, 'rb') as f_in:
                with open(sql_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            if progress_callback:
                await progress_callback(40, "Restoring database")
            
            env = os.environ.copy()
            env['PGPASSWORD'] = connection_config['password']
            
            cmd = [
                'psql',
                '-h', connection_config['host'],
                '-p', str(connection_config['port']),
                '-U', connection_config['username'],
                '-d', connection_config['database_name']
            ]
            
            start_time = datetime.now()
            
            with open(sql_file, 'r') as f:
                result = subprocess.run(
                    cmd,
                    stdin=f,
                    stderr=subprocess.PIPE,
                    text=True,
                    env=env
                )
            
            os.remove(sql_file)
            
            if result.returncode != 0:
                raise Exception(f"psql restore failed: {result.stderr}")
            
            duration = (datetime.now() - start_time).total_seconds()
            
            return {
                'success': True,
                'duration_seconds': round(duration, 2)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }
    
    @classmethod
    async def _restore_mysql_snapshot(
        cls,
        snapshot_path: str,
        connection_config: Dict,
        progress_callback
    ) -> Dict:
        """Restore MySQL from snapshot"""
        try:
            if progress_callback:
                await progress_callback(20, "Decompressing snapshot")
            
            sql_file = snapshot_path.replace('.gz', '')
            
            with gzip.open(snapshot_path, 'rb') as f_in:
                with open(sql_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            if progress_callback:
                await progress_callback(40, "Restoring database")
            
            cmd = [
                'mysql',
                '-h', connection_config['host'],
                '-P', str(connection_config['port']),
                '-u', connection_config['username'],
                f"-p{connection_config['password']}",
                connection_config['database_name']
            ]
            
            start_time = datetime.now()
            
            with open(sql_file, 'r') as f:
                result = subprocess.run(
                    cmd,
                    stdin=f,
                    stderr=subprocess.PIPE,
                    text=True
                )
            
            os.remove(sql_file)
            
            if result.returncode != 0:
                raise Exception(f"mysql restore failed: {result.stderr}")
            
            duration = (datetime.now() - start_time).total_seconds()
            
            return {
                'success': True,
                'duration_seconds': round(duration, 2)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }
    
    @classmethod
    async def _restore_mongodb_snapshot(
        cls,
        snapshot_path: str,
        connection_config: Dict,
        progress_callback
    ) -> Dict:
        """Restore MongoDB from snapshot"""
        try:
            if progress_callback:
                await progress_callback(20, "Decompressing snapshot")
            
            temp_dir = snapshot_path.replace('.sql.gz', '_restore_temp')
            
            import tarfile
            with tarfile.open(snapshot_path, 'r:gz') as tar:
                tar.extractall(temp_dir)
            
            if progress_callback:
                await progress_callback(40, "Restoring database")
            
            cmd = [
                'mongorestore',
                '--host', connection_config['host'],
                '--port', str(connection_config['port']),
                '--db', connection_config['database_name'],
                '--drop',
                os.path.join(temp_dir, connection_config['database_name'])
            ]
            
            if connection_config.get('username'):
                cmd.extend(['-u', connection_config['username']])
            if connection_config.get('password'):
                cmd.extend(['-p', connection_config['password']])
            
            start_time = datetime.now()
            
            result = subprocess.run(
                cmd,
                stderr=subprocess.PIPE,
                text=True
            )
            
            shutil.rmtree(temp_dir)
            
            if result.returncode != 0:
                raise Exception(f"mongorestore failed: {result.stderr}")
            
            duration = (datetime.now() - start_time).total_seconds()
            
            return {
                'success': True,
                'duration_seconds': round(duration, 2)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }
    
    @classmethod
    async def _restore_sqlite_snapshot(
        cls,
        snapshot_path: str,
        connection_config: Dict,
        progress_callback
    ) -> Dict:
        """Restore SQLite from snapshot"""
        try:
            if progress_callback:
                await progress_callback(20, "Decompressing snapshot")
            
            sql_file = snapshot_path.replace('.gz', '')
            
            with gzip.open(snapshot_path, 'rb') as f_in:
                with open(sql_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            if progress_callback:
                await progress_callback(40, "Restoring database")
            
            db_path = connection_config['database_name']
            
            start_time = datetime.now()
            
            if os.path.exists(db_path):
                backup_existing = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                shutil.copy2(db_path, backup_existing)
            
            shutil.copy2(sql_file, db_path)
            
            os.remove(sql_file)
            
            duration = (datetime.now() - start_time).total_seconds()
            
            return {
                'success': True,
                'duration_seconds': round(duration, 2)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }
    
    @classmethod
    async def _get_schema_metadata(cls, connection_config: Dict) -> Dict:
        """Get schema metadata using SchemaInspector"""
        try:
            schema = await SchemaInspector.get_schema(
                db_type=connection_config["db_type"],
                host=connection_config["host"],
                port=connection_config["port"],
                database=connection_config["database_name"],
                username=connection_config.get("username"),
                password=connection_config.get("password"),
                ssl_enabled=connection_config.get("ssl_enabled", False)
            )
            
            if schema["success"]:
                tables = schema["tables"]
                return {
                    "table_count": len(tables),
                    "total_rows": sum(t.get("row_count", 0) for t in tables),
                    "tables": [
                        {
                            "name": t["name"],
                            "row_count": t.get("row_count", 0),
                            "column_count": len(t.get("columns", []))
                        }
                        for t in tables
                    ]
                }
            else:
                return {"table_count": 0, "total_rows": 0, "tables": []}
                
        except Exception as e:
            print(f"Failed to get schema metadata: {e}")
            return {"table_count": 0, "total_rows": 0, "tables": []}
    
    @classmethod
    async def compare_snapshots(
        cls,
        snapshot1_metadata: Dict,
        snapshot2_metadata: Dict
    ) -> Dict:
        """
        Compare two snapshots and return differences
        
        Args:
            snapshot1_metadata: First snapshot's schema_metadata
            snapshot2_metadata: Second snapshot's schema_metadata
        
        Returns:
            Dict with differences (added/removed/modified tables)
        """
        try:
            tables1 = {t["name"]: t for t in snapshot1_metadata.get("tables", [])}
            tables2 = {t["name"]: t for t in snapshot2_metadata.get("tables", [])}
            
            added_tables = [name for name in tables2 if name not in tables1]
            removed_tables = [name for name in tables1 if name not in tables2]
            
            modified_tables = []
            for name in tables1:
                if name in tables2:
                    if tables1[name]["row_count"] != tables2[name]["row_count"] or \
                       tables1[name]["column_count"] != tables2[name]["column_count"]:
                        modified_tables.append({
                            "name": name,
                            "row_diff": tables2[name]["row_count"] - tables1[name]["row_count"],
                            "col_diff": tables2[name]["column_count"] - tables1[name]["column_count"]
                        })
            
            return {
                "added_tables": added_tables,
                "removed_tables": removed_tables,
                "modified_tables": modified_tables,
                "total_changes": len(added_tables) + len(removed_tables) + len(modified_tables)
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "added_tables": [],
                "removed_tables": [],
                "modified_tables": [],
                "total_changes": 0
            }