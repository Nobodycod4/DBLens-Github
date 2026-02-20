import os
import subprocess
import gzip
import shutil
from datetime import datetime
from typing import Dict, Optional

from app.core.config import settings
from app.utils.backup_encryption import encrypt_backup_file


def _maybe_encrypt_result(result: Dict) -> Dict:
    """If BACKUP_ENCRYPTION_ENABLED, encrypt the backup file and return updated result."""
    if not result.get("success") or not settings.BACKUP_ENCRYPTION_ENABLED:
        return result
    file_path = result.get("file_path")
    if not file_path or not os.path.isfile(file_path):
        return result
    try:
        enc_path = encrypt_backup_file(file_path)
        result["file_path"] = enc_path
        result["filename"] = result.get("filename", "") + ".enc"
        result["file_size_mb"] = round(os.path.getsize(enc_path) / (1024 * 1024), 2)
    except Exception:
        result["success"] = False
        result["error_message"] = "Backup encryption failed"
    return result


class BackupManager:
    """Handle database backup operations"""
    
    BACKUP_DIR = "./backups"
    
    @classmethod
    def ensure_backup_dir(cls):
        """Create backups directory if it doesn't exist"""
        if not os.path.exists(cls.BACKUP_DIR):
            os.makedirs(cls.BACKUP_DIR)
    
    @classmethod
    def generate_filename(cls, connection_id: int, db_name: str) -> str:
        """Generate backup filename with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        return f"conn_{connection_id}_{db_name}_{timestamp}.sql.gz"
    
    @classmethod
    async def backup_mysql(cls, connection_config: Dict) -> Dict:
        """Create MySQL backup using mysqldump"""
        cls.ensure_backup_dir()
        
        try:
            
            filename = cls.generate_filename(
                connection_config['connection_id'],
                connection_config['database_name']
            )
            sql_file = os.path.join(cls.BACKUP_DIR, filename.replace('.gz', ''))
            gz_file = os.path.join(cls.BACKUP_DIR, filename)
            
            
            cmd = [
                'mysqldump',
                '-h', connection_config['host'],
                '-P', str(connection_config['port']),
                '-u', connection_config['username'],
                f"-p{connection_config['password']}",
                connection_config['database_name']
            ]
            
            
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
            
            
            with open(sql_file, 'rb') as f_in:
                with gzip.open(gz_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            
            os.remove(sql_file)
            
            
            duration = (datetime.now() - start_time).total_seconds()
            file_size_mb = os.path.getsize(gz_file) / (1024 * 1024)
            
            return {
                'success': True,
                'filename': filename,
                'file_path': gz_file,
                'file_size_mb': round(file_size_mb, 2),
                'duration_seconds': round(duration, 2)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }
    
    @classmethod
    async def backup_postgresql(cls, connection_config: Dict) -> Dict:
        """Create PostgreSQL backup using pg_dump"""
        cls.ensure_backup_dir()
        
        try:
            
            filename = cls.generate_filename(
                connection_config['connection_id'],
                connection_config['database_name']
            )
            sql_file = os.path.join(cls.BACKUP_DIR, filename.replace('.gz', ''))
            gz_file = os.path.join(cls.BACKUP_DIR, filename)
            
            
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
            
            
            with open(sql_file, 'rb') as f_in:
                with gzip.open(gz_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            
            os.remove(sql_file)
            
            
            duration = (datetime.now() - start_time).total_seconds()
            file_size_mb = os.path.getsize(gz_file) / (1024 * 1024)
            
            result = {
                'success': True,
                'filename': filename,
                'file_path': gz_file,
                'file_size_mb': round(file_size_mb, 2),
                'duration_seconds': round(duration, 2)
            }
            return _maybe_encrypt_result(result)

        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }

    @classmethod
    async def restore_mysql(cls, backup_path: str, connection_config: Dict) -> Dict:
        """Restore MySQL database from backup"""
        try:
            
            sql_file = backup_path.replace('.gz', '')
            
            with gzip.open(backup_path, 'rb') as f_in:
                with open(sql_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            
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
    async def restore_postgresql(cls, backup_path: str, connection_config: Dict) -> Dict:
        """Restore PostgreSQL database from backup"""
        try:
            
            sql_file = backup_path.replace('.gz', '')
            
            with gzip.open(backup_path, 'rb') as f_in:
                with open(sql_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            
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
    async def backup_mongodb(cls, connection_config: Dict) -> Dict:
        """Create MongoDB backup using mongodump"""
        cls.ensure_backup_dir()
    
        try:
            
            filename = cls.generate_filename(
                connection_config['connection_id'],
                connection_config['database_name']
            )
            backup_dir = os.path.join(cls.BACKUP_DIR, f"mongo_temp_{connection_config['connection_id']}")
            gz_file = os.path.join(cls.BACKUP_DIR, filename)
        
            
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
        
        
            start_time = datetime.now()
        
            result = subprocess.run(
                cmd,
                stderr=subprocess.PIPE,
                text=True
            )
        
            if result.returncode != 0:
                raise Exception(f"mongodump failed: {result.stderr}")
        
            
            shutil.make_archive(backup_dir, 'gztar', backup_dir)
            os.rename(f"{backup_dir}.tar.gz", gz_file)
        
            
            shutil.rmtree(backup_dir)
        
            
            duration = (datetime.now() - start_time).total_seconds()
            file_size_mb = os.path.getsize(gz_file) / (1024 * 1024)
        
            result = {
                'success': True,
                'filename': filename,
                'file_path': gz_file,
                'file_size_mb': round(file_size_mb, 2),
                'duration_seconds': round(duration, 2)
            }
            return _maybe_encrypt_result(result)

        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }

    @classmethod
    async def backup_sqlite(cls, connection_config: dict) -> Dict:
        """Create SQLite backup using file copy"""
        cls.ensure_backup_dir()
    
        try:
            import aiosqlite
        
            
            filename = cls.generate_filename(
                connection_config['connection_id'],
                os.path.basename(connection_config['database_name'])
            )
            gz_file = os.path.join(cls.BACKUP_DIR, filename)
        
            
            db_path = connection_config['database_name']
        
            if not os.path.exists(db_path):
                raise Exception(f"SQLite database file not found: {db_path}")
        
            start_time = datetime.now()
        
            
            temp_copy = os.path.join(cls.BACKUP_DIR, f"temp_{filename.replace('.gz', '')}")
        
            
            async with aiosqlite.connect(db_path) as source:
                async with aiosqlite.connect(temp_copy) as dest:
                    await source.backup(dest)
        
            
            with open(temp_copy, 'rb') as f_in:
                with gzip.open(gz_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
        
            
            os.remove(temp_copy)
        
            
            duration = (datetime.now() - start_time).total_seconds()
            file_size_mb = os.path.getsize(gz_file) / (1024 * 1024)

            result = {
                'success': True,
                'filename': filename,
                'file_path': gz_file,
                'file_size_mb': round(file_size_mb, 2),
                'duration_seconds': round(duration, 2)
            }
            return _maybe_encrypt_result(result)

        except Exception as e:
            return {
                'success': False,
                'error_message': str(e)
            }

    @classmethod
    async def restore_mongodb(cls, file_path: str, connection_config: dict) -> Dict:
        """Placeholder for MongoDB restore"""
        return {
            "success": False, 
            "error_message": "MongoDB restore not yet implemented"
        }

    @classmethod
    async def restore_sqlite(cls, file_path: str, connection_config: dict) -> Dict:
        """Restore SQLite database from backup"""
        try:
            import aiosqlite
        
            
            sql_file = file_path.replace('.gz', '')
        
            with gzip.open(file_path, 'rb') as f_in:
                with open(sql_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
        
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