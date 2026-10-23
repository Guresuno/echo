import time
import json
import logging
from typing import Optional, Dict, Any, Set
from backend.config import settings

logger = logging.getLogger("echo.cache")

class InMemoryCache:
    """Thread-safe and async-safe in-memory cache with TTL fallback."""
    def __init__(self):
        self._store: Dict[str, tuple[Any, float]] = {}
        self._user_platforms: Dict[int, Set[str]] = {}
        self._user_status: Dict[int, str] = {}

    def set(self, key: str, value: Any, ex: Optional[int] = None):
        expire_at = time.time() + ex if ex else float('inf')
        self._store[key] = (value, expire_at)

    def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            val, expire_at = self._store[key]
            if time.time() < expire_at:
                return val
            else:
                del self._store[key]
        return None

    def delete(self, key: str):
        self._store.pop(key, None)

    # Presence & Platform Helpers
    def set_presence(self, user_id: int, platform: str, status: str = "online"):
        if user_id not in self._user_platforms:
            self._user_platforms[user_id] = set()
        self._user_platforms[user_id].add(platform)
        self._user_status[user_id] = status

    def remove_presence(self, user_id: int, platform: str):
        if user_id in self._user_platforms:
            self._user_platforms[user_id].discard(platform)
            if not self._user_platforms[user_id]:
                self._user_status[user_id] = "offline"

    def get_user_platforms(self, user_id: int) -> list[str]:
        return list(self._user_platforms.get(user_id, set()))

    def get_user_status(self, user_id: int) -> str:
        return self._user_status.get(user_id, "offline")


class CacheService:
    def __init__(self):
        self.fallback = InMemoryCache()
        self.redis_client = None
        self.is_redis_active = False

    async def connect(self):
        try:
            import redis.asyncio as aioredis
            self.redis_client = aioredis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD or None,
                decode_responses=True
            )
            await self.redis_client.ping()
            self.is_redis_active = True
            logger.info("[OK] Conexión establecida con Redis.")
        except Exception as e:
            self.is_redis_active = False
            logger.warning(f"Redis no disponible ({e}). Usando fallback en memoria con TTL.")

    async def set_json(self, key: str, value: Any, ex: int = 120):
        if self.is_redis_active and self.redis_client:
            try:
                await self.redis_client.set(key, json.dumps(value), ex=ex)
                return
            except Exception:
                pass
        self.fallback.set(key, value, ex=ex)

    async def get_json(self, key: str) -> Optional[Any]:
        if self.is_redis_active and self.redis_client:
            try:
                data = await self.redis_client.get(key)
                if data:
                    return json.loads(data)
            except Exception:
                pass
        return self.fallback.get(key)

    async def delete(self, key: str):
        if self.is_redis_active and self.redis_client:
            try:
                await self.redis_client.delete(key)
                return
            except Exception:
                pass
        self.fallback.delete(key)

    # User Presence & Multi-Platform Tracking
    async def track_user_connect(self, user_id: int, platform: str):
        self.fallback.set_presence(user_id, platform, "online")
        if self.is_redis_active and self.redis_client:
            try:
                await self.redis_client.sadd(f"user:{user_id}:platforms", platform)
                await self.redis_client.set(f"user:{user_id}:status", "online")
            except Exception:
                pass

    async def track_user_disconnect(self, user_id: int, platform: str):
        self.fallback.remove_presence(user_id, platform)
        if self.is_redis_active and self.redis_client:
            try:
                await self.redis_client.srem(f"user:{user_id}:platforms", platform)
                remaining = await self.redis_client.smembers(f"user:{user_id}:platforms")
                if not remaining:
                    await self.redis_client.set(f"user:{user_id}:status", "offline")
            except Exception:
                pass

    async def get_user_platforms(self, user_id: int) -> list[str]:
        if self.is_redis_active and self.redis_client:
            try:
                platforms = await self.redis_client.smembers(f"user:{user_id}:platforms")
                if platforms:
                    return list(platforms)
            except Exception:
                pass
        return self.fallback.get_user_platforms(user_id)

    async def get_user_status(self, user_id: int) -> str:
        if self.is_redis_active and self.redis_client:
            try:
                st = await self.redis_client.get(f"user:{user_id}:status")
                if st:
                    return st
            except Exception:
                pass
        return self.fallback.get_user_status(user_id)

cache = CacheService()
