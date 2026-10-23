import logging
from datetime import timedelta
from backend.config import settings

logger = logging.getLogger("echo.livekit")

def generate_livekit_token(room_name: str, user_id: int, identity: str, display_name: str, can_publish: bool = True) -> str:
    """
    Generates a cryptographically signed LiveKit Access Token for WebRTC audio/video/screen sharing.
    """
    try:
        from livekit import api
        token = api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET) \
            .with_identity(f"user_{user_id}_{identity}") \
            .with_name(display_name) \
            .with_grants(api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=can_publish,
                can_subscribe=True,
                can_publish_data=True
            )) \
            .with_ttl(timedelta(hours=6))
        return token.to_jwt()
    except Exception as e:
        logger.warning(f"Error generando token nativo LiveKit: {e}. Usando fallback firmado JWT.")
        # Fallback JWT format
        import jwt
        import time
        payload = {
            "sub": f"user_{user_id}_{identity}",
            "name": display_name,
            "video": {
                "room": room_name,
                "roomJoin": True,
                "canPublish": can_publish,
                "canSubscribe": True,
                "canPublishData": True
            },
            "iss": settings.LIVEKIT_API_KEY,
            "nbf": int(time.time()),
            "exp": int(time.time()) + 21600
        }
        return jwt.encode(payload, settings.LIVEKIT_API_SECRET, algorithm="HS256")
