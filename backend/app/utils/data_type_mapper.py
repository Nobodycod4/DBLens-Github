"""
Data Type Mapper for Database Migrations
Converts data types between different database systems
"""
from typing import Dict, Tuple, List, Any
from datetime import datetime
from decimal import Decimal


class DataTypeMapper:
    """Maps data types between different database systems"""
    
    MYSQL_TO_POSTGRESQL = {
        "tinyint": "smallint",
        "tinyint(1)": "boolean",
        "smallint": "smallint",
        "mediumint": "integer",
        "int": "integer",
        "integer": "integer",
        "bigint": "bigint",
        "float": "real",
        "double": "double precision",
        "decimal": "decimal",
        "numeric": "numeric",
        "char": "char",
        "varchar": "varchar",
        "tinytext": "text",
        "text": "text",
        "mediumtext": "text",
        "longtext": "text",
        "binary": "bytea",
        "varbinary": "bytea",
        "tinyblob": "bytea",
        "blob": "bytea",
        "mediumblob": "bytea",
        "longblob": "bytea",
        "date": "date",
        "datetime": "timestamp",
        "timestamp": "timestamp",
        "time": "time",
        "year": "smallint",
        "enum": "varchar",
        "set": "text",
        "json": "json",
        "boolean": "boolean",
    }
    
    POSTGRESQL_TO_MYSQL = {
        "smallint": "smallint",
        "integer": "int",
        "bigint": "bigint",
        "serial": "int auto_increment",
        "bigserial": "bigint auto_increment",
        "real": "float",
        "double precision": "double",
        "decimal": "decimal",
        "numeric": "decimal",
        "char": "char",
        "varchar": "varchar",
        "text": "text",
        "character varying": "varchar",
        "bytea": "blob",
        "date": "date",
        "timestamp": "datetime",
        "timestamp without time zone": "datetime",
        "timestamp with time zone": "datetime",
        "time": "time",
        "time without time zone": "time",
        "time with time zone": "time",
        "boolean": "tinyint(1)",
        "json": "json",
        "jsonb": "json",
        "uuid": "char(36)",
    }
    
    SQLITE_TYPE_MAP = {
        "integer": "INTEGER", "bigint": "INTEGER", "smallint": "INTEGER",
        "tinyint": "INTEGER", "int": "INTEGER", "serial": "INTEGER",
        "bigserial": "INTEGER",
        "varchar": "TEXT", "char": "TEXT", "text": "TEXT",
        "mediumtext": "TEXT", "longtext": "TEXT", "character varying": "TEXT",
        "decimal": "REAL", "numeric": "REAL", "float": "REAL",
        "double": "REAL", "real": "REAL", "double precision": "REAL",
        "boolean": "INTEGER", "bool": "INTEGER", "tinyint(1)": "INTEGER",
        "date": "TEXT", "datetime": "TEXT", "timestamp": "TEXT",
        "time": "TEXT",
        "blob": "BLOB", "bytea": "BLOB", "binary": "BLOB",
    }
    
    @staticmethod
    def get_column_data_type(col: Dict) -> str:
        """Safely extract data type from column dictionary"""
        for key in ['data_type', 'type', 'column_type', 'datatype']:
            if key in col:
                return str(col[key])
        return "text"
    
    @staticmethod
    def map_to_sqlite(source_type: str, source_db: str) -> str:
        """Map any source type to SQLite type"""
        source_type_lower = source_type.lower().split('(')[0]
        return DataTypeMapper.SQLITE_TYPE_MAP.get(source_type_lower, "TEXT")
    
    @staticmethod
    def get_create_table_sql_postgresql(
        table_name: str,
        columns: List[Dict],
        primary_keys: List[str],
        source_db: str
    ) -> str:
        """Generate CREATE TABLE SQL for PostgreSQL"""
        if not columns:
            raise Exception(f"Cannot create table {table_name}: no columns defined")
        
        col_defs = []
        
        for col in columns:
            col_name = col.get("name", col.get("column_name", "unknown"))
            source_type = DataTypeMapper.get_column_data_type(col)
            
            if source_db == "mysql":
                cleaned_type = source_type.lower().replace(' unsigned', '').replace(' zerofill', '').strip()
                base_type = cleaned_type.split('(')[0]
                col_type = DataTypeMapper.MYSQL_TO_POSTGRESQL.get(base_type, source_type)
                
                if '(' in source_type and col_type in ['char', 'varchar', 'decimal', 'numeric']:
                    if base_type in ('enum', 'set'):
                        col_type = 'varchar(255)' if col_type == 'varchar' else col_type
                    else:
                        length = source_type[source_type.index('('):source_type.index(')')+1]
                        col_type += length
            
            elif source_db == "sqlite":
                sqlite_to_pg = {
                    "integer": "integer",
                    "text": "text",
                    "real": "double precision",
                    "blob": "bytea"
                }
                col_type = sqlite_to_pg.get(source_type.lower(), "text")
            
            elif source_db == "mongodb":
                mongo_to_pg = {
                    "string": "text", "str": "text",
                    "integer": "integer", "int": "integer",
                    "double": "double precision", "float": "double precision",
                    "boolean": "boolean", "bool": "boolean",
                    "date": "timestamp", "datetime": "timestamp",
                    "object": "jsonb", "dict": "jsonb",
                    "array": "jsonb", "list": "jsonb",
                    "objectid": "varchar(24)",
                }
                col_type = mongo_to_pg.get(source_type.lower(), "text")
                
                if col_name == "_id":
                    col_type = "varchar(255)"
            else:
                col_type = source_type
            
            col_def = f'"{col_name}" {col_type}'
            
            if not col.get("is_nullable", True):
                col_def += " NOT NULL"
            
            col_defs.append(col_def)
        
        if primary_keys:
            pk_cols = ", ".join(f'"{pk}"' for pk in primary_keys)
            col_defs.append(f"PRIMARY KEY ({pk_cols})")
        
        sql = f'CREATE TABLE "{table_name}" (\n  '
        sql += ",\n  ".join(col_defs)
        sql += "\n)"
        return sql
    
    @staticmethod
    def get_create_table_sql_mysql(
        table_name: str,
        columns: List[Dict],
        primary_keys: List[str],
        source_db: str
    ) -> str:
        """Generate CREATE TABLE SQL for MySQL"""
        col_defs = []
        
        for col in columns:
            col_name = col.get("name", col.get("column_name", "unknown"))
            source_type = DataTypeMapper.get_column_data_type(col)
            is_primary_key = col_name in primary_keys
            
            if source_db == "postgresql":
                base_type = source_type.lower().split('(')[0]
                col_type = DataTypeMapper.POSTGRESQL_TO_MYSQL.get(base_type, source_type)
                
                if col_type == "varchar" and "(" not in col_type:
                    col_type = "varchar(255)"
                elif col_type == "char" and "(" not in col_type:
                    col_type = "char(255)"
            
            elif source_db == "sqlite":
                sqlite_to_mysql = {
                    "integer": "INT",
                    "text": "VARCHAR(255)" if is_primary_key else "TEXT",  # FIXED: Use VARCHAR for PKs
                    "real": "DOUBLE",
                    "blob": "BLOB"
                }
                col_type = sqlite_to_mysql.get(source_type.lower(), "VARCHAR(255)" if is_primary_key else "TEXT")
            
            elif source_db == "mongodb":
                mongo_to_mysql = {
                    "string": "TEXT", "str": "TEXT",
                    "integer": "INT", "int": "INT",
                    "double": "DOUBLE", "float": "DOUBLE",
                    "boolean": "TINYINT(1)", "bool": "TINYINT(1)",
                    "date": "DATETIME", "datetime": "DATETIME",
                    "object": "JSON", "dict": "JSON",
                    "array": "JSON", "list": "JSON",
                    "objectid": "VARCHAR(24)",
                }
                col_type = mongo_to_mysql.get(source_type.lower(), "TEXT")
                
                if col_name == "_id":
                    col_type = "VARCHAR(255)"
            else:
                col_type = source_type
            
            col_def = f"`{col_name}` {col_type}"
            
            if not col.get("is_nullable", True):
                col_def += " NOT NULL"
            
            col_defs.append(col_def)
        
        if primary_keys:
            pk_cols = ", ".join(f"`{pk}`" for pk in primary_keys)
            col_defs.append(f"PRIMARY KEY ({pk_cols})")
        
        sql = f"CREATE TABLE `{table_name}` (\n  "
        sql += ",\n  ".join(col_defs)
        sql += "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        return sql
    
    @staticmethod
    def get_create_table_sql_sqlite(
        table_name: str,
        columns: List[Dict],
        primary_keys: List[str],
        source_db: str
    ) -> str:
        """Generate CREATE TABLE SQL for SQLite"""
        if not columns:
            raise Exception(f"Cannot create table {table_name}: no columns defined")
        
        col_defs = []
        
        for col in columns:
            col_name = col.get("name", col.get("column_name", "unknown"))
            source_type = DataTypeMapper.get_column_data_type(col)
            
            if source_db == "mongodb" and col_name == "_id":
                col_type = "TEXT"
            else:
                col_type = DataTypeMapper.map_to_sqlite(source_type, source_db)
            
            col_def = f"`{col_name}` {col_type}"
            
            if not col.get("is_nullable", True):
                col_def += " NOT NULL"
            
            col_defs.append(col_def)
        
        if primary_keys:
            pk_cols = ", ".join(f"`{pk}`" for pk in primary_keys)
            col_defs.append(f"PRIMARY KEY ({pk_cols})")
        
        sql = f"CREATE TABLE `{table_name}` (\n  "
        sql += ",\n  ".join(col_defs)
        sql += "\n)"
        return sql
    
    @staticmethod
    def get_create_table_sql(
        table_name: str,
        columns: List[Dict],
        primary_keys: List[str],
        source_db: str,
        target_db: str
    ) -> str:
        """Generate CREATE TABLE SQL for target database"""
        if target_db == "postgresql":
            return DataTypeMapper.get_create_table_sql_postgresql(
                table_name, columns, primary_keys, source_db
            )
        elif target_db == "mysql":
            return DataTypeMapper.get_create_table_sql_mysql(
                table_name, columns, primary_keys, source_db
            )
        elif target_db == "sqlite":
            return DataTypeMapper.get_create_table_sql_sqlite(
                table_name, columns, primary_keys, source_db
            )
        elif target_db == "mongodb":
            return ""
        else:
            raise Exception(f"Unsupported target database: {target_db}")
    
    @staticmethod
    def get_insert_sql(
        table_name: str,
        columns: List[str],
        target_db: str
    ) -> str:
        """Generate INSERT SQL for target database"""
        if target_db == "postgresql":
            col_names = ", ".join(f'"{col}"' for col in columns)
            placeholders = ", ".join([f"${i+1}" for i in range(len(columns))])
            return f'INSERT INTO "{table_name}" ({col_names}) VALUES ({placeholders})'
        
        elif target_db == "mysql":
            col_names = ", ".join(f"`{col}`" for col in columns)
            placeholders = ", ".join(["%s"] * len(columns))
            return f"INSERT INTO `{table_name}` ({col_names}) VALUES ({placeholders})"
        
        elif target_db == "sqlite":
            col_names = ", ".join(f"`{col}`" for col in columns)
            placeholders = ", ".join(["?"] * len(columns))
            return f"INSERT INTO `{table_name}` ({col_names}) VALUES ({placeholders})"
        
        elif target_db == "mongodb":
            return ""
        
        else:
            raise Exception(f"Unsupported target database: {target_db}")