from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.models import ChannelModel, UserModel
from backend.auth import get_current_user
from backend.permissions import PermissionFlags, has_permission
from backend.routers.servers import get_user_server_permissions
from backend.livekit_service import generate_livekit_token
from backend.config import settings

router = APIRouter(prefix="", tags=["Voice, Video & Screen Sharing"])

@router.post("/channels/{channel_id}/voice/token")
async def get_voice_token(channel_id: int, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = int(current_user["sub"])
    chan_res = await db.execute(select(ChannelModel).where(ChannelModel.ChannelID == channel_id))
    chan = chan_res.scalars().first()
    if not chan:
        raise HTTPException(status_code=404, detail="Canal no encontrado.")

    if chan.ChannelType != "VOICE_VIDEO":
        raise HTTPException(status_code=400, detail="Este canal no es de voz/video.")

    perms = await get_user_server_permissions(chan.ServerID, user_id, db)
    if not has_permission(perms, PermissionFlags.CONNECT_VOICE):
        raise HTTPException(status_code=403, detail="Sin permiso para conectarse a canales de voz.")

    can_stream = has_permission(perms, PermissionFlags.STREAM_VIDEO_SCREEN)

    user_res = await db.execute(select(UserModel).where(UserModel.UserID == user_id))
    user = user_res.scalars().first()

    room_name = f"channel_{channel_id}"
    token = generate_livekit_token(
        room_name=room_name,
        user_id=user_id,
        identity=user.Username,
        display_name=user.DisplayName,
        can_publish=can_stream
    )

    return {
        "room_name": room_name,
        "token": token,
        "livekit_url": settings.LIVEKIT_URL,
        "ice_servers": [
            {"urls": "stun:stun.l.google.com:19302"},
            {"urls": "stun:echo.local:3478"}
        ]
    }
