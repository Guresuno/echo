import os
import uuid
import logging
from typing import Tuple
from backend.config import settings

logger = logging.getLogger("echo.storage")

class StorageService:
    def __init__(self):
        self.minio_client = None
        self.is_minio_active = False
        os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)

    def connect(self):
        try:
            from minio import Minio
            self.minio_client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE
            )
            # Check or create bucket
            if not self.minio_client.bucket_exists(settings.MINIO_BUCKET):
                self.minio_client.make_bucket(settings.MINIO_BUCKET)
            self.is_minio_active = True
            logger.info(f"[OK] MinIO conectado en {settings.MINIO_ENDPOINT}, bucket: {settings.MINIO_BUCKET}")
        except Exception as e:
            self.is_minio_active = False
            logger.warning(f"MinIO no disponible ({e}). Usando almacenamiento local estructurado en {settings.LOCAL_STORAGE_DIR}.")

    async def save_file(self, file_bytes: bytes, filename: str, content_type: str = "application/octet-stream") -> str:
        """
        Saves file to MinIO or local storage and returns public/accessible URL.
        """
        ext = os.path.splitext(filename)[1].lower()
        unique_name = f"{uuid.uuid4().hex}{ext}"

        if self.is_minio_active and self.minio_client:
            try:
                import io
                stream = io.BytesIO(file_bytes)
                self.minio_client.put_object(
                    settings.MINIO_BUCKET,
                    unique_name,
                    stream,
                    length=len(file_bytes),
                    content_type=content_type
                )
                return f"http://{settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET}/{unique_name}"
            except Exception as e:
                logger.warning(f"Error subiendo a MinIO: {e}, guardando en local.")

        # Local fallback
        dest_path = os.path.join(settings.LOCAL_STORAGE_DIR, unique_name)
        with open(dest_path, "wb") as f:
            f.write(file_bytes)

        return f"/uploads/{unique_name}"

storage = StorageService()
