import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.models import MessageModel, ChannelModel, UserModel, MessageCreate, MessageResponse
from backend.auth import get_current_user
from backend.permissions import PermissionFlags, has_permission
from backend.routers.servers import get_user_server_permissions
from backend.storage import storage
from backend.audio_processor import extract_waveform_peaks, transcode_to_opus
from backend.cache import cache

router = APIRouter(prefix="", tags=["Messages & Voice Notes"])

@router.get("/channels/{channel_id}/messages", response_model=list[MessageResponse])
async def get_messages(channel_id: int, limit: int = 50, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = int(current_user["sub"])
    chan_res = await db.execute(select(ChannelModel).where(ChannelModel.ChannelID == channel_id))
    chan = chan_res.scalars().first()
    if not chan:
        raise HTTPException(status_code=404, detail="Canal no encontrado.")

    perms = await get_user_server_permissions(chan.ServerID, user_id, db)
    if not has_permission(perms, PermissionFlags.VIEW_CHANNELS):
        raise HTTPException(status_code=403, detail="Sin permiso para ver este canal.")

    res = await db.execute(
        select(MessageModel, UserModel)
        .join(UserModel, UserModel.UserID == MessageModel.SenderID)
        .where(MessageModel.ChannelID == channel_id)
        .order_by(MessageModel.MessageID.asc())
        .limit(limit)
    )

    items = []
    for msg, user in res.all():
        platforms = await cache.get_user_platforms(user.UserID)
        items.append(MessageResponse(
            MessageID=msg.MessageID,
            ChannelID=msg.ChannelID,
            SenderID=msg.SenderID,
            SenderName=user.Username,
            SenderDisplayName=user.DisplayName,
            SenderAvatar=user.AvatarURL,
            SenderActivePlatforms=platforms or ["PC_DESKTOP"],
            Content=msg.Content,
            MessageType=msg.MessageType,
            AttachmentURL=msg.AttachmentURL,
            MetadataJSON=msg.MetadataJSON,
            CreatedAt=msg.CreatedAt
        ))
    return items

@router.post("/channels/{channel_id}/messages", response_model=MessageResponse)
async def send_message(channel_id: int, req: MessageCreate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = int(current_user["sub"])
    chan_res = await db.execute(select(ChannelModel).where(ChannelModel.ChannelID == channel_id))
    chan = chan_res.scalars().first()
    if not chan:
        raise HTTPException(status_code=404, detail="Canal no encontrado.")

    perms = await get_user_server_permissions(chan.ServerID, user_id, db)
    if not has_permission(perms, PermissionFlags.SEND_MESSAGES):
        raise HTTPException(status_code=403, detail="Sin permiso para enviar mensajes.")

    user_res = await db.execute(select(UserModel).where(UserModel.UserID == user_id))
    user = user_res.scalars().first()

    msg = MessageModel(
        ChannelID=channel_id,
        SenderID=user_id,
        Content=req.Content,
        MessageType=req.MessageType,
        AttachmentURL=req.AttachmentURL,
        MetadataJSON=req.MetadataJSON,
        CreatedAt=datetime.utcnow()
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    platforms = await cache.get_user_platforms(user_id)
    return MessageResponse(
        MessageID=msg.MessageID,
        ChannelID=msg.ChannelID,
        SenderID=msg.SenderID,
        SenderName=user.Username,
        SenderDisplayName=user.DisplayName,
        SenderAvatar=user.AvatarURL,
        SenderActivePlatforms=platforms or ["PC_DESKTOP"],
        Content=msg.Content,
        MessageType=msg.MessageType,
        AttachmentURL=msg.AttachmentURL,
        MetadataJSON=msg.MetadataJSON,
        CreatedAt=msg.CreatedAt
    )

@router.post("/channels/{channel_id}/voice-notes", response_model=MessageResponse)
async def upload_voice_note(
    channel_id: int,
    file: UploadFile = File(...),
    duration: float = Form(0.0),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Voice Notes: Opus encoded (.opus/.ogg) with 40-sample waveform peaks calculation for interactive wave display.
    """
    user_id = int(current_user["sub"])
    chan_res = await db.execute(select(ChannelModel).where(ChannelModel.ChannelID == channel_id))
    chan = chan_res.scalars().first()
    if not chan:
        raise HTTPException(status_code=404, detail="Canal no encontrado.")

    perms = await get_user_server_permissions(chan.ServerID, user_id, db)
    if not has_permission(perms, PermissionFlags.SEND_VOICE_NOTES):
        raise HTTPException(status_code=403, detail="Sin permiso para enviar notas de voz.")

    raw_audio = await file.read()
    peaks = extract_waveform_peaks(raw_audio, num_peaks=40)
    transcoded_audio, mime_type = transcode_to_opus(raw_audio)

    # Save to storage
    file_url = await storage.save_file(transcoded_audio, "voice_note.opus", mime_type)

    user_res = await db.execute(select(UserModel).where(UserModel.UserID == user_id))
    user = user_res.scalars().first()

    metadata = json.dumps({
        "waveform_peaks": peaks,
        "duration_seconds": round(duration, 2),
        "mime_type": mime_type
    })

    msg = MessageModel(
        ChannelID=channel_id,
        SenderID=user_id,
        Content=None,
        MessageType="VOICE_NOTE",
        AttachmentURL=file_url,
        MetadataJSON=metadata,
        CreatedAt=datetime.utcnow()
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    platforms = await cache.get_user_platforms(user_id)
    return MessageResponse(
        MessageID=msg.MessageID,
        ChannelID=msg.ChannelID,
        SenderID=msg.SenderID,
        SenderName=user.Username,
        SenderDisplayName=user.DisplayName,
        SenderAvatar=user.AvatarURL,
        SenderActivePlatforms=platforms or ["PC_DESKTOP"],
        Content=msg.Content,
        MessageType=msg.MessageType,
        AttachmentURL=msg.AttachmentURL,
        MetadataJSON=msg.MetadataJSON,
        CreatedAt=msg.CreatedAt
    )
