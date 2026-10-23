import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.database import init_db
from backend.cache import cache
from backend.storage import storage
from backend.routers import auth, users, servers, messages, assets, voice, websockets

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("echo.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("==================================================")
    logger.info(f" Arrancando {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("==================================================")
    
    # 1. Connect Cache
    await cache.connect()
    
    # 2. Connect Storage
    storage.connect()
    
    # 3. Initialize Database & DDL
    await init_db()
    
    yield
    
    logger.info("Cerrando servicios de Echo...")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration for desktop (tauri / localhost) and mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "tauri://localhost"
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads (avatars, stickers, voice notes)
os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.LOCAL_STORAGE_DIR), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(servers.router)
app.include_router(messages.router)
app.include_router(assets.router)
app.include_router(voice.router)
app.include_router(websockets.router)

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "ONLINE",
        "redis_active": cache.is_redis_active,
        "minio_active": storage.is_minio_active
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
