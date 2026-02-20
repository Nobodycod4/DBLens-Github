from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


DEFAULT_JWT_SECRET_PLACEHOLDER = "your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random-abc123xyz789"


class Settings(BaseSettings):
    PROJECT_NAME: str = "DBLens"
    VERSION: str = "5.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    LOG_LEVEL: str = "INFO"

    API_V1_PREFIX: str = "/api/v1"

    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_USER: str = "aathithyan-zsbth009"
    DATABASE_PASSWORD: str = "root"
    DATABASE_NAME: str = "dblens"

    DB_STORAGE_PATH: str = "./dblens_databases"
    POSTGRES_DOCKER_IMAGE: str = "postgres:16-alpine"
    MYSQL_DOCKER_IMAGE: str = "mysql:8.0"
    MONGODB_DOCKER_IMAGE: str = "mongo:7.0"

    JWT_SECRET_KEY: str = DEFAULT_JWT_SECRET_PLACEHOLDER
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    MIN_PASSWORD_LENGTH: int = 8
    REQUIRE_UPPERCASE: bool = True
    REQUIRE_LOWERCASE: bool = True
    REQUIRE_DIGIT: bool = True
    REQUIRE_SPECIAL_CHAR: bool = True

    API_KEY_LENGTH: int = 32
    API_KEY_PREFIX_LENGTH: int = 8

    ENCRYPTION_KEY: str = "IMkCqOtne_8RiVNoIkYC3Oa11HGBQChh1PBqcF0au2g="

    BACKUP_ENCRYPTION_ENABLED: bool = True

    RATE_LIMIT_API_PER_MINUTE: int = 200

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://10.94.72.230:5173",
    ]

    STATIC_DIR: str = ""  # e.g. "static" or absolute path; empty = do not serve frontend

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def DATABASE_URL(self) -> str:
        """PostgreSQL connection URL for DBLens metadata database"""
        return f"postgresql+asyncpg://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"

    def validate_production_secrets(self) -> None:
        """Raise if production and default/placeholder secrets are used."""
        if not self.is_production:
            return
        if self.JWT_SECRET_KEY == DEFAULT_JWT_SECRET_PLACEHOLDER or (self.JWT_SECRET_KEY or "").startswith("your-"):
            raise ValueError(
                "Production requires a non-default JWT_SECRET_KEY. Set JWT_SECRET_KEY in .env."
            )
        if (self.ENCRYPTION_KEY or "").startswith("your-"):
            raise ValueError(
                "Production requires a non-default ENCRYPTION_KEY. "
                "Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )


settings = Settings()