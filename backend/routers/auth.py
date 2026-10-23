import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.models import UserModel, TrustedDeviceModel, UserRegister, UserLogin, AutoLoginRequest, SwitchAccountRequest, TokenResponse, UserResponse
from backend.auth import get_password_hash, verify_password, create_access_token, create_refresh_token, hash_refresh_token, get_current_user
from backend.cache import cache

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])

def build_user_response(user: UserModel, active_platforms: list[str] = None) -> UserResponse:
    return UserResponse(
        UserID=user.UserID,
        Username=user.Username,
        DisplayName=user.DisplayName,
        AvatarURL=user.AvatarURL,
        BannerColor=user.BannerColor or "#5865F2",
        StatusText=user.StatusText,
        CreatedAt=user.CreatedAt,
        ActivePlatforms=active_platforms or ["PC_DESKTOP"],
        Roles=[]
    )

@router.post("/register", response_model=TokenResponse)
async def register(req: UserRegister, db: AsyncSession = Depends(get_db)):
    # Username uniqueness check (case-insensitive)
    normalized_username = req.Username.strip().lower()
    if len(normalized_username) < 3:
        raise HTTPException(status_code=400, detail="El nombre de usuario debe tener al menos 3 caracteres.")
    
    result = await db.execute(select(UserModel).where(UserModel.Username == normalized_username))
    if result.scalars().first():
        raise HTTPException(status_code=409, detail=f"El nombre de usuario '@{normalized_username}' ya está en uso.")

    # Create User
    new_user = UserModel(
        Username=normalized_username,
        DisplayName=req.DisplayName.strip(),
        PasswordHash=get_password_hash(req.Password),
        AvatarURL=f"https://api.dicebear.com/7.x/bottts/svg?seed={normalized_username}",
        BannerColor="#5865F2",
        StatusText="¡Hola! Estoy usando Echo."
    )
    db.add(new_user)
    await db.flush()

    # Generate Tokens
    access_token = create_access_token({"sub": str(new_user.UserID), "username": new_user.Username, "display_name": new_user.DisplayName})
    refresh_token = create_refresh_token(new_user.UserID)
    refresh_hash = hash_refresh_token(refresh_token)

    # Register HardwareID if provided
    if req.HardwareID:
        # Check if hardware already has a primary owner
        trusted = TrustedDeviceModel(
            HardwareID=req.HardwareID,
            DeviceName=req.DeviceName or "Dispositivo Principal",
            PlatformType=req.PlatformType or "PC_DESKTOP",
            UserID=new_user.UserID,
            RefreshTokenHash=refresh_hash,
            IsPrimaryOwner=True,
            LastActiveAt=datetime.utcnow()
        )
        db.add(trusted)

    await db.commit()
    await db.refresh(new_user)

    platforms = await cache.get_user_platforms(new_user.UserID)
    return TokenResponse(
        AccessToken=access_token,
        RefreshToken=refresh_token,
        User=build_user_response(new_user, platforms)
    )

@router.post("/login", response_model=TokenResponse)
async def login(req: UserLogin, db: AsyncSession = Depends(get_db)):
    normalized_username = req.Username.strip().lower()
    result = await db.execute(select(UserModel).where(UserModel.Username == normalized_username))
    user = result.scalars().first()
    
    if not user or not verify_password(req.Password, user.PasswordHash):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos.")

    access_token = create_access_token({"sub": str(user.UserID), "username": user.Username, "display_name": user.DisplayName})
    refresh_token = create_refresh_token(user.UserID)
    refresh_hash = hash_refresh_token(refresh_token)

    # Handle Hardware ID registration
    if req.HardwareID:
        # If set as primary, unset other primary accounts on this hardware
        if req.SetAsPrimary:
            await db.execute(
                update(TrustedDeviceModel)
                .where(TrustedDeviceModel.HardwareID == req.HardwareID)
                .values(IsPrimaryOwner=False)
            )

        # Check existing trust
        trusted_res = await db.execute(
            select(TrustedDeviceModel).where(
                and_(
                    TrustedDeviceModel.HardwareID == req.HardwareID,
                    TrustedDeviceModel.UserID == user.UserID
                )
            )
        )
        trusted = trusted_res.scalars().first()
        if trusted:
            trusted.RefreshTokenHash = refresh_hash
            trusted.LastActiveAt = datetime.utcnow()
            if req.SetAsPrimary:
                trusted.IsPrimaryOwner = True
        else:
            trusted = TrustedDeviceModel(
                HardwareID=req.HardwareID,
                DeviceName=req.DeviceName or "Dispositivo de Usuario",
                PlatformType=req.PlatformType or "PC_DESKTOP",
                UserID=user.UserID,
                RefreshTokenHash=refresh_hash,
                IsPrimaryOwner=bool(req.SetAsPrimary),
                LastActiveAt=datetime.utcnow()
            )
            db.add(trusted)

    await db.commit()
    platforms = await cache.get_user_platforms(user.UserID)
    return TokenResponse(
        AccessToken=access_token,
        RefreshToken=refresh_token,
        User=build_user_response(user, platforms)
    )

@router.post("/auto-login", response_model=TokenResponse)
async def auto_login(req: AutoLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Zero-Click Auto-Login: Instant startup recognizing the primary owner of the HardwareID.
    """
    result = await db.execute(
        select(TrustedDeviceModel, UserModel)
        .join(UserModel, TrustedDeviceModel.UserID == UserModel.UserID)
        .where(
            and_(
                TrustedDeviceModel.HardwareID == req.HardwareID,
                TrustedDeviceModel.IsPrimaryOwner == True
            )
        )
    )
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay ninguna cuenta primaria asociada a este HardwareID."
        )

    device, user = row
    device.LastActiveAt = datetime.utcnow()
    
    # Renew tokens
    access_token = create_access_token({"sub": str(user.UserID), "username": user.Username, "display_name": user.DisplayName})
    refresh_token = create_refresh_token(user.UserID)
    device.RefreshTokenHash = hash_refresh_token(refresh_token)
    
    await db.commit()
    platforms = await cache.get_user_platforms(user.UserID)
    return TokenResponse(
        AccessToken=access_token,
        RefreshToken=refresh_token,
        User=build_user_response(user, platforms)
    )

@router.post("/switch-account", response_model=TokenResponse)
async def switch_account(req: SwitchAccountRequest, db: AsyncSession = Depends(get_db)):
    """
    Account Switcher: Instantly switch to another pre-authorized account on this machine.
    """
    result = await db.execute(
        select(TrustedDeviceModel, UserModel)
        .join(UserModel, TrustedDeviceModel.UserID == UserModel.UserID)
        .where(
            and_(
                TrustedDeviceModel.HardwareID == req.HardwareID,
                TrustedDeviceModel.UserID == req.TargetUserID
            )
        )
    )
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta solicitada no está autorizada en este HardwareID."
        )

    device, user = row
    device.LastActiveAt = datetime.utcnow()
    
    access_token = create_access_token({"sub": str(user.UserID), "username": user.Username, "display_name": user.DisplayName})
    refresh_token = create_refresh_token(user.UserID)
    device.RefreshTokenHash = hash_refresh_token(refresh_token)

    await db.commit()
    platforms = await cache.get_user_platforms(user.UserID)
    return TokenResponse(
        AccessToken=access_token,
        RefreshToken=refresh_token,
        User=build_user_response(user, platforms)
    )

@router.get("/hardware-accounts/{hardware_id}")
async def get_hardware_accounts(hardware_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns list of authorized accounts stored in Device Trust Vault for this HardwareID.
    """
    result = await db.execute(
        select(UserModel, TrustedDeviceModel)
        .join(TrustedDeviceModel, UserModel.UserID == TrustedDeviceModel.UserID)
        .where(TrustedDeviceModel.HardwareID == hardware_id)
        .order_by(TrustedDeviceModel.IsPrimaryOwner.desc(), TrustedDeviceModel.LastActiveAt.desc())
    )
    accounts = []
    for user, device in result.all():
        accounts.append({
            "UserID": user.UserID,
            "Username": user.Username,
            "DisplayName": user.DisplayName,
            "AvatarURL": user.AvatarURL,
            "IsPrimaryOwner": device.IsPrimaryOwner,
            "LastActiveAt": device.LastActiveAt
        })
    return {"HardwareID": hardware_id, "accounts": accounts}

# ==============================================================================
# QR CODE LOGIN PROTOCOL (Discord-style PC <-> Mobile)
# ==============================================================================

@router.post("/qr/scan")
async def qr_scan(payload: dict, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Step 2: Mobile scans QR code (miapp://qr-login/{qr_token}).
    Server updates session to SCANNED and notifies PC with Avatar & DisplayName.
    """
    qr_token = payload.get("qr_token")
    if not qr_token:
        raise HTTPException(status_code=400, detail="qr_token requerido.")

    session_data = await cache.get_json(f"qr:{qr_token}")
    if not session_data:
        raise HTTPException(status_code=404, detail="El código QR ha expirado o no es válido.")

    user_id = int(current_user["sub"])
    res = await db.execute(select(UserModel).where(UserModel.UserID == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    # Update QR session state
    session_data["status"] = "SCANNED"
    session_data["user"] = {
        "UserID": user.UserID,
        "Username": user.Username,
        "DisplayName": user.DisplayName,
        "AvatarURL": user.AvatarURL
    }
    await cache.set_json(f"qr:{qr_token}", session_data, ex=120)

    # Broadcast update to PC WebSocket via cache signal
    await cache.set_json(f"qr_event:{qr_token}", {"event": "SCANNED", "user": session_data["user"]}, ex=60)
    return {"status": "SCANNED", "message": "Confirmación pendiente en el dispositivo móvil."}

@router.post("/qr/approve")
async def qr_approve(payload: dict, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Step 3: Mobile approves login with optional Hardware Trust (Auto-login switch).
    Server generates JWTs and injects them to PC via WebSocket.
    """
    qr_token = payload.get("qr_token")
    trust_device = payload.get("trust_device", False)
    if not qr_token:
        raise HTTPException(status_code=400, detail="qr_token requerido.")

    session_data = await cache.get_json(f"qr:{qr_token}")
    if not session_data:
        raise HTTPException(status_code=404, detail="Sesión QR expirada o inválida.")

    user_id = int(current_user["sub"])
    res = await db.execute(select(UserModel).where(UserModel.UserID == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    # Generate PC tokens
    access_token = create_access_token({"sub": str(user.UserID), "username": user.Username, "display_name": user.DisplayName})
    refresh_token = create_refresh_token(user.UserID)
    refresh_hash = hash_refresh_token(refresh_token)

    # If trust_device is enabled and PC provided its hardware_id
    pc_hwid = session_data.get("hardware_id")
    pc_name = session_data.get("device_name", "PC Escritorio")
    if trust_device and pc_hwid:
        trusted_res = await db.execute(
            select(TrustedDeviceModel).where(
                and_(
                    TrustedDeviceModel.HardwareID == pc_hwid,
                    TrustedDeviceModel.UserID == user.UserID
                )
            )
        )
        trusted = trusted_res.scalars().first()
        if trusted:
            trusted.RefreshTokenHash = refresh_hash
            trusted.IsPrimaryOwner = True
            trusted.LastActiveAt = datetime.utcnow()
        else:
            trusted = TrustedDeviceModel(
                HardwareID=pc_hwid,
                DeviceName=pc_name,
                PlatformType="PC_DESKTOP",
                UserID=user.UserID,
                RefreshTokenHash=refresh_hash,
                IsPrimaryOwner=True,
                LastActiveAt=datetime.utcnow()
            )
            db.add(trusted)
        await db.commit()

    # Deliver tokens to PC
    token_payload = {
        "AccessToken": access_token,
        "RefreshToken": refresh_token,
        "User": {
            "UserID": user.UserID,
            "Username": user.Username,
            "DisplayName": user.DisplayName,
            "AvatarURL": user.AvatarURL,
            "BannerColor": user.BannerColor,
            "StatusText": user.StatusText,
            "ActivePlatforms": ["PC_DESKTOP"]
        }
    }
    session_data["status"] = "APPROVED"
    session_data["tokens"] = token_payload
    await cache.set_json(f"qr:{qr_token}", session_data, ex=60)
    await cache.set_json(f"qr_event:{qr_token}", {"event": "APPROVED", "payload": token_payload}, ex=60)

    return {"status": "APPROVED", "message": "Inicio de sesión aprobado correctamente."}
