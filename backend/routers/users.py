from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.models import UserModel, MemberRoleModel, RoleModel, UserResponse
from backend.auth import get_current_user
from backend.cache import cache
from backend.storage import storage

router = APIRouter(prefix="/users", tags=["Users & Profiles"])

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = int(current_user["sub"])
    res = await db.execute(select(UserModel).where(UserModel.UserID == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    platforms = await cache.get_user_platforms(user_id)
    return UserResponse(
        UserID=user.UserID,
        Username=user.Username,
        DisplayName=user.DisplayName,
        AvatarURL=user.AvatarURL,
        BannerColor=user.BannerColor or "#5865F2",
        StatusText=user.StatusText,
        CreatedAt=user.CreatedAt,
        ActivePlatforms=platforms or ["PC_DESKTOP"],
        Roles=[]
    )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_profile(user_id: int, server_id: int = None, db: AsyncSession = Depends(get_db)):
    """
    Profile Card Popover: Returns user details, active platforms, and roles in the context server.
    """
    res = await db.execute(select(UserModel).where(UserModel.UserID == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    platforms = await cache.get_user_platforms(user_id)
    user_roles = []
    if server_id:
        roles_res = await db.execute(
            select(RoleModel)
            .join(MemberRoleModel, MemberRoleModel.RoleID == RoleModel.RoleID)
            .where(MemberRoleModel.ServerID == server_id, MemberRoleModel.UserID == user_id)
            .order_by(RoleModel.Position.desc())
        )
        for r in roles_res.scalars().all():
            user_roles.append({
                "RoleID": r.RoleID,
                "Name": r.Name,
                "ColorHex": r.ColorHex,
                "Position": r.Position,
                "PermissionsBitmask": r.PermissionsBitmask
            })

    return UserResponse(
        UserID=user.UserID,
        Username=user.Username,
        DisplayName=user.DisplayName,
        AvatarURL=user.AvatarURL,
        BannerColor=user.BannerColor or "#5865F2",
        StatusText=user.StatusText,
        CreatedAt=user.CreatedAt,
        ActivePlatforms=platforms or ["PC_DESKTOP"],
        Roles=user_roles
    )

@router.patch("/me", response_model=UserResponse)
async def update_profile(payload: dict, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = int(current_user["sub"])
    res = await db.execute(select(UserModel).where(UserModel.UserID == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if "DisplayName" in payload:
        user.DisplayName = payload["DisplayName"].strip()
    if "BannerColor" in payload:
        user.BannerColor = payload["BannerColor"].strip()
    if "StatusText" in payload:
        user.StatusText = payload["StatusText"].strip()
    if "AvatarURL" in payload:
        user.AvatarURL = payload["AvatarURL"].strip()

    await db.commit()
    await db.refresh(user)
    platforms = await cache.get_user_platforms(user_id)
    return UserResponse(
        UserID=user.UserID,
        Username=user.Username,
        DisplayName=user.DisplayName,
        AvatarURL=user.AvatarURL,
        BannerColor=user.BannerColor,
        StatusText=user.StatusText,
        CreatedAt=user.CreatedAt,
        ActivePlatforms=platforms or ["PC_DESKTOP"],
        Roles=[]
    )

@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_id = int(current_user["sub"])
    contents = await file.read()
    file_url = await storage.save_file(contents, file.filename, file.content_type)
    
    res = await db.execute(select(UserModel).where(UserModel.UserID == user_id))
    user = res.scalars().first()
    if user:
        user.AvatarURL = file_url
        await db.commit()
    
    return {"AvatarURL": file_url}


# ==============================================================================
# GOOGLE PLAY UGC: BLOCK & REPORT MODERATION ENDPOINTS
# ==============================================================================

@router.post("/{user_id}/block")
async def block_user(user_id: int, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    my_id = int(current_user["sub"])
    if my_id == user_id:
        raise HTTPException(status_code=400, detail="No puedes bloquearte a ti mismo.")

    # Check if target user exists
    target_res = await db.execute(select(UserModel).where(UserModel.UserID == user_id))
    if not target_res.scalars().first():
        raise HTTPException(status_code=404, detail="Usuario a bloquear no encontrado.")

    from backend.models import BlockedUserModel
    # Check if already blocked
    existing = await db.execute(select(BlockedUserModel).where(
        BlockedUserModel.UserID == my_id,
        BlockedUserModel.BlockedUserID == user_id
    ))
    if existing.scalars().first():
        return {"status": "already_blocked", "message": "Usuario ya está bloqueado."}

    new_block = BlockedUserModel(UserID=my_id, BlockedUserID=user_id)
    db.add(new_block)
    await db.commit()
    return {"status": "success", "message": f"Usuario con ID {user_id} bloqueado con éxito."}


@router.delete("/{user_id}/block")
async def unblock_user(user_id: int, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    my_id = int(current_user["sub"])
    from backend.models import BlockedUserModel
    res = await db.execute(select(BlockedUserModel).where(
        BlockedUserModel.UserID == my_id,
        BlockedUserModel.BlockedUserID == user_id
    ))
    record = res.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="El usuario no estaba bloqueado.")

    await db.delete(record)
    await db.commit()
    return {"status": "success", "message": f"Usuario con ID {user_id} desbloqueado."}


@router.get("/me/blocked")
async def get_blocked_users(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    my_id = int(current_user["sub"])
    from backend.models import BlockedUserModel
    res = await db.execute(select(BlockedUserModel.BlockedUserID).where(BlockedUserModel.UserID == my_id))
    blocked_ids = res.scalars().all()
    return {"blocked_user_ids": list(blocked_ids)}


@router.post("/{user_id}/report")
async def report_user(user_id: int, payload: dict, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    my_id = int(current_user["sub"])
    if my_id == user_id:
        raise HTTPException(status_code=400, detail="No puedes reportarte a ti mismo.")

    from backend.models import UserReportModel
    reason = payload.get("Reason", "HARASSMENT")
    details = payload.get("Details", "")
    message_id = payload.get("MessageID")

    report = UserReportModel(
        ReporterID=my_id,
        ReportedUserID=user_id,
        MessageID=message_id,
        Reason=reason,
        Details=details,
        Status="PENDING"
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return {
        "status": "success",
        "message": "Reporte enviado con éxito a los moderadores de Echo. Gracias por mantener la comunidad segura.",
        "ReportID": report.ReportID
    }


@router.get("/reports/pending")
async def get_pending_reports(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Admin / Moderator queue for reviewing reports."""
    from backend.models import UserReportModel
    res = await db.execute(select(UserReportModel).order_by(UserReportModel.CreatedAt.desc()))
    reports = res.scalars().all()
    return [{
        "ReportID": r.ReportID,
        "ReporterID": r.ReporterID,
        "ReportedUserID": r.ReportedUserID,
        "MessageID": r.MessageID,
        "Reason": r.Reason,
        "Details": r.Details,
        "Status": r.Status,
        "CreatedAt": r.CreatedAt
    } for r in reports]

