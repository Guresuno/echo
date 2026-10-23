from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.models import CustomAssetModel, CustomAssetCreate, CustomAssetResponse
from backend.auth import get_current_user
from backend.permissions import PermissionFlags, has_permission
from backend.routers.servers import get_user_server_permissions
from backend.storage import storage

router = APIRouter(prefix="", tags=["Custom Assets & Animation Studio"])

@router.get("/servers/{server_id}/assets", response_model=list[CustomAssetResponse])
async def list_assets(server_id: int, asset_type: str = None, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(CustomAssetModel).where(CustomAssetModel.ServerID == server_id)
    if asset_type:
        query = query.where(CustomAssetModel.AssetType == asset_type.upper())
    
    res = await db.execute(query.order_by(CustomAssetModel.CreatedAt.desc()))
    return res.scalars().all()

@router.post("/servers/{server_id}/assets", response_model=CustomAssetResponse)
async def create_asset(
    server_id: int,
    shortcode: str = Form(...),
    asset_type: str = Form(...),  # 'EMOJI' or 'STICKER'
    is_animated: bool = Form(False),
    project_json: str = Form(None),
    fps: int = Form(24),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = int(current_user["sub"])
    perms = await get_user_server_permissions(server_id, user_id, db)
    if not has_permission(perms, PermissionFlags.MANAGE_EMOJIS_STICKERS) and not has_permission(perms, PermissionFlags.USE_CUSTOM_EMOJIS_STICKERS):
        raise HTTPException(status_code=403, detail="Sin permiso para crear emojis o stickers personalizados.")

    cleaned_shortcode = shortcode.strip().replace(":", "").replace(" ", "_").lower()
    file_bytes = await file.read()
    file_url = await storage.save_file(file_bytes, file.filename, file.content_type)

    asset = CustomAssetModel(
        ServerID=server_id,
        CreatorID=user_id,
        Shortcode=cleaned_shortcode,
        AssetType=asset_type.upper(),
        IsAnimated=is_animated,
        FileURL=file_url,
        ProjectJSON=project_json,
        FPS=fps
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset

@router.get("/assets/{asset_id}/project")
async def get_asset_project(asset_id: int, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Retrieves serialized ProjectJSON (layers, keyframes, tweening data) to reopen in Frame-by-Frame Studio.
    """
    res = await db.execute(select(CustomAssetModel).where(CustomAssetModel.AssetID == asset_id))
    asset = res.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset no encontrado.")
    return {
        "AssetID": asset.AssetID,
        "Shortcode": asset.Shortcode,
        "AssetType": asset.AssetType,
        "IsAnimated": asset.IsAnimated,
        "FPS": asset.FPS,
        "ProjectJSON": asset.ProjectJSON,
        "FileURL": asset.FileURL
    }

@router.put("/assets/{asset_id}/project")
async def update_asset_project(
    asset_id: int,
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = int(current_user["sub"])
    res = await db.execute(select(CustomAssetModel).where(CustomAssetModel.AssetID == asset_id))
    asset = res.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset no encontrado.")

    if asset.CreatorID != user_id:
        perms = await get_user_server_permissions(asset.ServerID, user_id, db)
        if not has_permission(perms, PermissionFlags.ADMINISTRATOR):
            raise HTTPException(status_code=403, detail="Solo el creador o un administrador pueden editar este proyecto.")

    if "ProjectJSON" in payload:
        asset.ProjectJSON = payload["ProjectJSON"]
    if "FPS" in payload:
        asset.FPS = payload["FPS"]
    if "FileURL" in payload:
        asset.FileURL = payload["FileURL"]

    await db.commit()
    return {"status": "SUCCESS", "message": "Proyecto de animación actualizado correctamente."}
