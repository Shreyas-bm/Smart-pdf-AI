import os
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = Field(
        default="postgresql://smart_pdf_user:smart_pdf_password@localhost:5432/smart_pdf_db"
    )
    
    # Storage settings
    S3_ENDPOINT_URL: Optional[str] = Field(default=None)
    S3_ACCESS_KEY_ID: Optional[str] = Field(default=None)
    S3_SECRET_ACCESS_KEY: Optional[str] = Field(default=None)
    S3_BUCKET_NAME: str = Field(default="smart-pdf-bucket")
    S3_REGION_NAME: str = Field(default="us-east-1")
    
    # JWT authentication settings
    JWT_SECRET: str = Field(
        default="supersecretjwtkeyforlocaldevelopmentonlychangeinprod"
    )
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_EXPIRATION_MINUTES: int = Field(default=10080)  # 7 days
    
    # CORS settings
    CORS_ORIGINS: List[str] = Field(default=["*"])
    
    # Redis / Celery settings
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # Load from .env file at the workspace root or backend root
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
