from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.models import ServerModel, ChannelModel, RoleModel, ServerMemberModel, MemberRoleModel, UserModel, ServerCreate, ServerResponse, ChannelCreate, ChannelResponse, RoleCreate, RoleResponse
from backend.auth import get_current_user
from backend.permissions import PermissionFlags, combine_permissions, has_permission
from backend.cache import cache

router = APIRouter(prefix="/servers", tags=["Servers & Channels"])

async def get_user_server_permissions(server_id: int, user_id: int, db: AsyncSession) -> int:
    # Check if owner
    res_s = await db.execute(select(ServerModel).where(ServerModel.ServerID == server_id))
    srv = res_s.scalars().first()
    if srv and srv.OwnerID == user_id:
        return PermissionFlags.ALL

    # Fetch assigned roles
    roles_res = await db.execute(
        select(RoleModel.PermissionsBitmask)
        .join(MemberRoleModel, MemberRoleModel.RoleID == RoleModel.RoleID)
        .where(MemberRoleModel.ServerID == server_id, MemberRoleModel.UserID == user_id)
    )
    masks = roles_res.scalars().all()
    return combine_permissions(masks)

@router.post("", response_model=ServerResponse)
async def create_server(req: ServerCreate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = int(current_user["sub"])
    srv = ServerModel(
        Name=req.Name.strip(),
        IconURL=req.IconURL or f"https://api.dicebear.com/7.x/identicon/svg?seed={req.Name}",
        OwnerID=user_id
    )
    db.add(srv)
    await db.flush()

    # Admin role
    admin_role = RoleModel(
        ServerID=srv.ServerID,
        Name="Admin",
        ColorHex="#FEE75C",
        Position=10,
        PermissionsBitmask=PermissionFlags.ALL
    )
    member_role = RoleModel(
        ServerID=srv.ServerID,
        Name="Miembro",
        ColorHex="#99AAB5",
        Position=1,
        PermissionsBitmask=PermissionFlags.VIEW_CHANNELS | PermissionFlags.SEND_MESSAGES | PermissionFlags.SEND_VOICE_NOTES | PermissionFlags.ATTACH_FILES | PermissionFlags.USE_CUSTOM_EMOJIS_STICKERS | PermissionFlags.CONNECT_VOICE | PermissionFlags.STREAM_VIDEO_SCREEN
    )
    db.add_all([admin_role, member_role])
    await db.flush()

    # Default channels
    gen_chan = ChannelModel(ServerID=srv.ServerID, Name="general", ChannelType="TEXT", Position=0)
    voice_chan = ChannelModel(ServerID=srv.ServerID, Name="General Voz", ChannelType="VOICE_VIDEO", Position=1)
    db.add_all([gen_chan, voice_chan])

    # Owner membership
    member = ServerMemberModel(ServerID=srv.ServerID, UserID=user_id)
    db.add(member)
    await db.flush()
    db.add(MemberRoleModel(ServerID=srv.ServerID, UserID=user_id, RoleID=admin_role.RoleID))

    await db.commit()
    await db.refresh(srv)
    return srv

@router.get("", response_model=list[ServerResponse])
async def list_user_servers(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = int(current_user["sub"])
    res = await db.execute(
        select(ServerModel)
        .join(ServerMemberModel, ServerMemberModel.ServerID == ServerModel.ServerID)
        .where(ServerMemberModel.UserID == user_id)
    )
    return res.scalars().all()

@router.get("/{server_id}/channels", response_model=list[ChannelResponse])
async def get_server_channels(server_id: int, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = int(current_user["sub"])
    perms = await get_user_server_permissions(server_id, user_id, db)
    if not has_permission(perms, PermissionFlags.VIEW_CHANNELS):
        raise HTTPException(status_code=403, detail="No tienes permisos para ver los canales de este servidor.")

    res = await db.execute(
        select(ChannelModel).where(ChannelModel.ServerID == server_id).order_by(ChannelModel.Position.asc())
    )
    return res.scalars().all()

@router.post("/{server_id}/channels", response_model=ChannelResponse)
async def create_channel(server_id: int, req: ChannelCreate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = int(current_user["sub"])
    perms = await get_user_server_permissions(server_id, user_id, db)
    if not has_permission(perms, PermissionFlags.ADMINISTRATOR) and not has_permission(perms, PermissionFlags.MANAGE_ROLES):
        raise HTTPException(status_code=403, detail="No tienes permisos para crear canales.")

    chan = ChannelModel(
        ServerID=server_id,
        Name=req.Name.strip().lower().replace(" ", "-"),
        ChannelType=req.ChannelType,
        Position=req.Position
    )
    db.add(chan)
    await db.commit()
    await db.refresh(chan)
    return chan

@router.get("/{server_id}/roles", response_model=list[RoleResponse])
async def list_roles(server_id: int, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(RoleModel).where(RoleModel.ServerID == server_id).order_by(RoleModel.Position.desc())
    )
    return res.scalars().all()

@router.post("/{server_id}/roles", response_model=RoleResponse)
async def create_role(server_id: int, req: RoleCreate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = int(current_user["sub"])
    perms = await get_user_server_permissions(server_id, user_id, db)
    if not has_permission(perms, PermissionFlags.ADMINISTRATOR) and not has_permission(perms, PermissionFlags.MANAGE_ROLES):
        raise HTTPException(status_code=403, detail="Permisos insuficientes para administrar roles.")

    role = RoleModel(
        ServerID=server_id,
        Name=req.Name,
        ColorHex=req.ColorHex,
        Position=req.Position,
        PermissionsBitmask=req.PermissionsBitmask
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role

@router.get("/{server_id}/members")
async def list_members(server_id: int, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(UserModel, ServerMemberModel.Nickname)
        .join(ServerMemberModel, ServerMemberModel.UserID == UserModel.UserID)
        .where(ServerMemberModel.ServerID == server_id)
    )
    members = []
    for user, nickname in res.all():
        platforms = await cache.get_user_platforms(user.UserID)
        status = await cache.get_user_status(user.UserID)
        
        # Get roles
        roles_res = await db.execute(
            select(RoleModel)
            .join(MemberRoleModel, MemberRoleModel.RoleID == RoleModel.RoleID)
            .where(MemberRoleModel.ServerID == server_id, MemberRoleModel.UserID == user.UserID)
            .order_by(RoleModel.Position.desc())
        )
        roles = [{"RoleID": r.RoleID, "Name": r.Name, "ColorHex": r.ColorHex} for r in roles_res.scalars().all()]
        
        members.append({
            "UserID": user.UserID,
            "Username": user.Username,
            "DisplayName": nickname or user.DisplayName,
            "AvatarURL": user.AvatarURL,
            "Status": status,
            "ActivePlatforms": platforms or ["PC_DESKTOP"],
            "Roles": roles
        })
    return members
