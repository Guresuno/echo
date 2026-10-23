import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Echo Real-Time Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database Configuration (SQL Server primary, SQLite fallback)
    SQL_SERVER_HOST: str = os.getenv("SQL_SERVER_HOST", "localhost")
    SQL_SERVER_PORT: int = int(os.getenv("SQL_SERVER_PORT", "1433"))
    SQL_SERVER_USER: str = os.getenv("SQL_SERVER_USER", "sa")
    SQL_SERVER_PASSWORD: str = os.getenv("SQL_SERVER_PASSWORD", "EchoStrongPassword2026!")
    SQL_SERVER_DATABASE: str = os.getenv("SQL_SERVER_DATABASE", "echo_db")
    SQL_SERVER_DRIVER: str = os.getenv("SQL_SERVER_DRIVER", "ODBC Driver 18 for SQL Server")
    
    # Redis Configuration
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
    
    # MinIO / S3 Object Storage Configuration
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "echo_admin")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "echo_secret_password_2026")
    MINIO_BUCKET: str = os.getenv("MINIO_BUCKET", "echo-media")
    MINIO_SECURE: bool = os.getenv("MINIO_SECURE", "false").lower() == "true"
    LOCAL_STORAGE_DIR: str = os.path.join(os.path.dirname(__file__), "uploads")
    
    # LiveKit Voice & Video SFU
    LIVEKIT_URL: str = os.getenv("LIVEKIT_URL", "ws://localhost:7880")
    LIVEKIT_API_KEY: str = os.getenv("LIVEKIT_API_KEY", "devkey")
    LIVEKIT_API_SECRET: str = os.getenv("LIVEKIT_API_SECRET", "secretsecretsecretsecretsecretsecret")
    
    # Security & Tokens
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "echo_super_secret_jwt_master_key_2026_x89f_secure")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    QR_TOKEN_EXPIRE_SECONDS: int = 120
    
    # Bitwise Permission Definitions
    VIEW_CHANNELS: int = 1 << 0             # 1
    SEND_MESSAGES: int = 1 << 1             # 2
    SEND_VOICE_NOTES: int = 1 << 2          # 4
    ATTACH_FILES: int = 1 << 3              # 8
    USE_CUSTOM_EMOJIS_STICKERS: int = 1 << 4 # 16
    MANAGE_EMOJIS_STICKERS: int = 1 << 5    # 32
    CONNECT_VOICE: int = 1 << 6             # 64
    STREAM_VIDEO_SCREEN: int = 1 << 7       # 128
    MANAGE_ROLES: int = 1 << 8              # 256
    ADMINISTRATOR: int = 1 << 9             # 512

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
