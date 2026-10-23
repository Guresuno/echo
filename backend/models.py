from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, DateTime, ForeignKey, Boolean, SmallInteger
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

# ==============================================================================
# SQLALCHEMY ORM MODELS (Direct match with Microsoft SQL Server DDL)
# ==============================================================================

class UserModel(Base):
    __tablename__ = "Users"

    UserID = Column(Integer, primary_key=True, autoincrement=True)
    Username = Column(String(32), unique=True, nullable=False, index=True)
    DisplayName = Column(String(50), nullable=False)
    PasswordHash = Column(String(255), nullable=False)
    AvatarURL = Column(String(500), nullable=True)
    BannerColor = Column(String(7), default="#5865F2")
    StatusText = Column(String(100), nullable=True)
    CreatedAt = Column(DateTime, default=datetime.utcnow)

    trusted_devices = relationship("TrustedDeviceModel", back_populates="user", cascade="all, delete-orphan")
    owned_servers = relationship("ServerModel", back_populates="owner")
    memberships = relationship("ServerMemberModel", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("MessageModel", back_populates="sender")
    assets = relationship("CustomAssetModel", back_populates="creator")


class TrustedDeviceModel(Base):
    __tablename__ = "TrustedDevices"

    DeviceTrustID = Column(Integer, primary_key=True, autoincrement=True)
    HardwareID = Column(String(128), nullable=False, index=True)
    DeviceName = Column(String(100), nullable=False)
    PlatformType = Column(String(30), nullable=False)  # PC_DESKTOP, TABLET_IPAD, IOS_PHONE, ANDROID_PHONE, MOBILE_GENERIC, CONSOLE
    UserID = Column(Integer, ForeignKey("Users.UserID", ondelete="CASCADE"), nullable=False)
    RefreshTokenHash = Column(String(255), nullable=False)
    IsPrimaryOwner = Column(Boolean, default=True)
    LastActiveAt = Column(DateTime, default=datetime.utcnow)

    user = relationship("UserModel", back_populates="trusted_devices")


class ServerModel(Base):
    __tablename__ = "Servers"

    ServerID = Column(Integer, primary_key=True, autoincrement=True)
    Name = Column(String(100), nullable=False)
    IconURL = Column(String(500), nullable=True)
    OwnerID = Column(Integer, ForeignKey("Users.UserID"), nullable=False)
    CreatedAt = Column(DateTime, default=datetime.utcnow)

    owner = relationship("UserModel", back_populates="owned_servers")
    roles = relationship("RoleModel", back_populates="server", cascade="all, delete-orphan")
    members = relationship("ServerMemberModel", back_populates="server", cascade="all, delete-orphan")
    channels = relationship("ChannelModel", back_populates="server", cascade="all, delete-orphan")
    assets = relationship("CustomAssetModel", back_populates="server", cascade="all, delete-orphan")


class RoleModel(Base):
    __tablename__ = "Roles"

    RoleID = Column(Integer, primary_key=True, autoincrement=True)
    ServerID = Column(Integer, ForeignKey("Servers.ServerID", ondelete="CASCADE"), nullable=False)
    Name = Column(String(50), nullable=False)
    ColorHex = Column(String(7), default="#99AAB5")
    Position = Column(Integer, default=0, nullable=False)
    PermissionsBitmask = Column(BigInteger, default=0, nullable=False)

    server = relationship("ServerModel", back_populates="roles")


class ServerMemberModel(Base):
    __tablename__ = "ServerMembers"

    ServerID = Column(Integer, ForeignKey("Servers.ServerID", ondelete="CASCADE"), primary_key=True)
    UserID = Column(Integer, ForeignKey("Users.UserID", ondelete="CASCADE"), primary_key=True)
    Nickname = Column(String(50), nullable=True)
    JoinedAt = Column(DateTime, default=datetime.utcnow)

    server = relationship("ServerModel", back_populates="members")
    user = relationship("UserModel", back_populates="memberships")


class MemberRoleModel(Base):
    __tablename__ = "MemberRoles"

    ServerID = Column(Integer, primary_key=True)
    UserID = Column(Integer, primary_key=True)
    RoleID = Column(Integer, ForeignKey("Roles.RoleID", ondelete="CASCADE"), primary_key=True)


class ChannelModel(Base):
    __tablename__ = "Channels"

    ChannelID = Column(Integer, primary_key=True, autoincrement=True)
    ServerID = Column(Integer, ForeignKey("Servers.ServerID", ondelete="CASCADE"), nullable=False)
    Name = Column(String(100), nullable=False)
    ChannelType = Column(String(20), nullable=False)  # 'TEXT', 'VOICE_VIDEO'
    Position = Column(Integer, default=0)

    server = relationship("ServerModel", back_populates="channels")
    messages = relationship("MessageModel", back_populates="channel", cascade="all, delete-orphan")


class CustomAssetModel(Base):
    __tablename__ = "CustomAssets"

    AssetID = Column(Integer, primary_key=True, autoincrement=True)
    ServerID = Column(Integer, ForeignKey("Servers.ServerID", ondelete="CASCADE"), nullable=False)
    CreatorID = Column(Integer, ForeignKey("Users.UserID"), nullable=False)
    Shortcode = Column(String(50), nullable=False)
    AssetType = Column(String(20), nullable=False)  # 'EMOJI', 'STICKER'
    IsAnimated = Column(Boolean, default=False, nullable=False)
    FileURL = Column(String(500), nullable=False)
    ProjectJSON = Column(Text, nullable=True)
    FPS = Column(SmallInteger, default=24)
    CreatedAt = Column(DateTime, default=datetime.utcnow)

    server = relationship("ServerModel", back_populates="assets")
    creator = relationship("UserModel", back_populates="assets")


class MessageModel(Base):
    __tablename__ = "Messages"

    MessageID = Column(Integer().with_variant(BigInteger, "mssql"), primary_key=True, autoincrement=True)
    ChannelID = Column(Integer, ForeignKey("Channels.ChannelID", ondelete="CASCADE"), nullable=False)
    SenderID = Column(Integer, ForeignKey("Users.UserID"), nullable=False)
    Content = Column(Text, nullable=True)
    MessageType = Column(String(20), default="DEFAULT")  # 'DEFAULT', 'VOICE_NOTE', 'STICKER', 'FILE'
    AttachmentURL = Column(String(500), nullable=True)
    MetadataJSON = Column(Text, nullable=True)
    CreatedAt = Column(DateTime, default=datetime.utcnow)

    channel = relationship("ChannelModel", back_populates="messages")
    sender = relationship("UserModel", back_populates="messages")


# ==============================================================================
# PYDANTIC SCHEMAS (API Requests & Responses)
# ==============================================================================

class UserBase(BaseModel):
    Username: str = Field(..., max_length=32)
    DisplayName: str = Field(..., max_length=50)

class UserRegister(UserBase):
    Password: str
    HardwareID: Optional[str] = None
    DeviceName: Optional[str] = None
    PlatformType: Optional[str] = "PC_DESKTOP"

class UserLogin(BaseModel):
    Username: str
    Password: str
    HardwareID: Optional[str] = None
    DeviceName: Optional[str] = None
    PlatformType: Optional[str] = "PC_DESKTOP"
    SetAsPrimary: Optional[bool] = True

class AutoLoginRequest(BaseModel):
    HardwareID: str
    DeviceName: Optional[str] = None
    PlatformType: Optional[str] = "PC_DESKTOP"

class SwitchAccountRequest(BaseModel):
    HardwareID: str
    TargetUserID: int

class UserResponse(BaseModel):
    UserID: int
    Username: str
    DisplayName: str
    AvatarURL: Optional[str] = None
    BannerColor: Optional[str] = "#5865F2"
    StatusText: Optional[str] = None
    CreatedAt: Optional[datetime] = None
    ActivePlatforms: Optional[List[str]] = []
    Roles: Optional[List[dict]] = []

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    AccessToken: str
    RefreshToken: str
    TokenType: str = "Bearer"
    User: UserResponse

class RoleCreate(BaseModel):
    Name: str
    ColorHex: str = "#99AAB5"
    Position: int = 0
    PermissionsBitmask: int = 0

class RoleResponse(BaseModel):
    RoleID: int
    ServerID: int
    Name: str
    ColorHex: str
    Position: int
    PermissionsBitmask: int

    class Config:
        from_attributes = True

class ServerCreate(BaseModel):
    Name: str
    IconURL: Optional[str] = None

class ServerResponse(BaseModel):
    ServerID: int
    Name: str
    IconURL: Optional[str] = None
    OwnerID: int
    CreatedAt: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChannelCreate(BaseModel):
    Name: str
    ChannelType: str = "TEXT"  # 'TEXT' or 'VOICE_VIDEO'
    Position: int = 0

class ChannelResponse(BaseModel):
    ChannelID: int
    ServerID: int
    Name: str
    ChannelType: str
    Position: int

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    Content: Optional[str] = None
    MessageType: str = "DEFAULT"  # 'DEFAULT', 'VOICE_NOTE', 'STICKER', 'FILE'
    AttachmentURL: Optional[str] = None
    MetadataJSON: Optional[str] = None

class MessageResponse(BaseModel):
    MessageID: int
    ChannelID: int
    SenderID: int
    SenderName: Optional[str] = None
    SenderDisplayName: Optional[str] = None
    SenderAvatar: Optional[str] = None
    SenderActivePlatforms: Optional[List[str]] = []
    Content: Optional[str] = None
    MessageType: str
    AttachmentURL: Optional[str] = None
    MetadataJSON: Optional[str] = None
    CreatedAt: datetime

    class Config:
        from_attributes = True

class CustomAssetCreate(BaseModel):
    ServerID: int
    Shortcode: str
    AssetType: str  # 'EMOJI' or 'STICKER'
    IsAnimated: bool = False
    FileURL: str
    ProjectJSON: Optional[str] = None
    FPS: int = 24

class CustomAssetResponse(BaseModel):
    AssetID: int
    ServerID: int
    CreatorID: int
    Shortcode: str
    AssetType: str
    IsAnimated: bool
    FileURL: str
    ProjectJSON: Optional[str] = None
    FPS: int
    CreatedAt: datetime

    class Config:
        from_attributes = True
