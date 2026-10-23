import os
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from backend.config import settings
from backend.models import Base

logger = logging.getLogger("echo.database")
logging.basicConfig(level=logging.INFO)

# Exact DDL Script from Section 6 of Specification
DDL_SQL_SERVER = """
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
BEGIN
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username VARCHAR(32) NOT NULL CONSTRAINT UQ_Users_Username UNIQUE,
    DisplayName NVARCHAR(50) NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    AvatarURL VARCHAR(500) NULL,
    BannerColor VARCHAR(7) DEFAULT '#5865F2',
    StatusText NVARCHAR(100) NULL,
    CreatedAt DATETIME2 DEFAULT SYSDATETIME()
);
END;

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TrustedDevices' AND xtype='U')
BEGIN
CREATE TABLE TrustedDevices (
    DeviceTrustID INT IDENTITY(1,1) PRIMARY KEY,
    HardwareID VARCHAR(128) NOT NULL,
    DeviceName NVARCHAR(100) NOT NULL,
    PlatformType VARCHAR(30) NOT NULL,
    UserID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID) ON DELETE CASCADE,
    RefreshTokenHash VARCHAR(255) NOT NULL,
    IsPrimaryOwner BIT DEFAULT 1,
    LastActiveAt DATETIME2 DEFAULT SYSDATETIME()
);
END;

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Servers' AND xtype='U')
BEGIN
CREATE TABLE Servers (
    ServerID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    IconURL VARCHAR(500) NULL,
    OwnerID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    CreatedAt DATETIME2 DEFAULT SYSDATETIME()
);
END;

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Roles' AND xtype='U')
BEGIN
CREATE TABLE Roles (
    RoleID INT IDENTITY(1,1) PRIMARY KEY,
    ServerID INT NOT NULL FOREIGN KEY REFERENCES Servers(ServerID) ON DELETE CASCADE,
    Name NVARCHAR(50) NOT NULL,
    ColorHex VARCHAR(7) DEFAULT '#99AAB5',
    Position INT NOT NULL DEFAULT 0,
    PermissionsBitmask BIGINT NOT NULL DEFAULT 0
);
END;

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ServerMembers' AND xtype='U')
BEGIN
CREATE TABLE ServerMembers (
    ServerID INT NOT NULL FOREIGN KEY REFERENCES Servers(ServerID) ON DELETE CASCADE,
    UserID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID) ON DELETE CASCADE,
    Nickname NVARCHAR(50) NULL,
    JoinedAt DATETIME2 DEFAULT SYSDATETIME(),
    PRIMARY KEY (ServerID, UserID)
);
END;

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MemberRoles' AND xtype='U')
BEGIN
CREATE TABLE MemberRoles (
    ServerID INT NOT NULL,
    UserID INT NOT NULL,
    RoleID INT NOT NULL FOREIGN KEY REFERENCES Roles(RoleID) ON DELETE CASCADE,
    PRIMARY KEY (ServerID, UserID, RoleID),
    FOREIGN KEY (ServerID, UserID) REFERENCES ServerMembers(ServerID, UserID)
);
END;

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Channels' AND xtype='U')
BEGIN
CREATE TABLE Channels (
    ChannelID INT IDENTITY(1,1) PRIMARY KEY,
    ServerID INT NOT NULL FOREIGN KEY REFERENCES Servers(ServerID) ON DELETE CASCADE,
    Name NVARCHAR(100) NOT NULL,
    ChannelType VARCHAR(20) NOT NULL,
    Position INT DEFAULT 0
);
END;

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CustomAssets' AND xtype='U')
BEGIN
CREATE TABLE CustomAssets (
    AssetID INT IDENTITY(1,1) PRIMARY KEY,
    ServerID INT NOT NULL FOREIGN KEY REFERENCES Servers(ServerID) ON DELETE CASCADE,
    CreatorID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    Shortcode VARCHAR(50) NOT NULL,
    AssetType VARCHAR(20) NOT NULL,
    IsAnimated BIT NOT NULL DEFAULT 0,
    FileURL VARCHAR(500) NOT NULL,
    ProjectJSON NVARCHAR(MAX) NULL,
    FPS TINYINT DEFAULT 24,
    CreatedAt DATETIME2 DEFAULT SYSDATETIME()
);
END;

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Messages' AND xtype='U')
BEGIN
CREATE TABLE Messages (
    MessageID BIGINT IDENTITY(1,1) PRIMARY KEY,
    ChannelID INT NOT NULL FOREIGN KEY REFERENCES Channels(ChannelID) ON DELETE CASCADE,
    SenderID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    Content NVARCHAR(MAX) NULL,
    MessageType VARCHAR(20) DEFAULT 'DEFAULT',
    AttachmentURL VARCHAR(500) NULL,
    MetadataJSON NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 DEFAULT SYSDATETIME()
);
END;
"""

engine = None
AsyncSessionLocal = None
IS_SQL_SERVER = False

async def init_db():
    global engine, AsyncSessionLocal, IS_SQL_SERVER
    
    # Try connecting to Microsoft SQL Server first
    mssql_url = (
        f"mssql+aioodbc://{settings.SQL_SERVER_USER}:{settings.SQL_SERVER_PASSWORD}@"
        f"{settings.SQL_SERVER_HOST}:{settings.SQL_SERVER_PORT}/{settings.SQL_SERVER_DATABASE}?"
        f"driver={settings.SQL_SERVER_DRIVER.replace(' ', '+')}&TrustServerCertificate=yes"
    )
    
    try:
        logger.info(f"Conectando a Microsoft SQL Server en {settings.SQL_SERVER_HOST}:{settings.SQL_SERVER_PORT}...")
        test_engine = create_async_engine(mssql_url, echo=False, pool_pre_ping=True)
        async with test_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        
        engine = test_engine
        IS_SQL_SERVER = True
        logger.info("[OK] Conexión establecida con éxito con Microsoft SQL Server.")
        
        # Execute DDL
        async with engine.begin() as conn:
            for statement in DDL_SQL_SERVER.split("END;"):
                stmt = statement.strip()
                if stmt:
                    await conn.execute(text(stmt + " END;"))
            logger.info("[OK] DDL de Microsoft SQL Server verificado y aplicado.")
            
    except Exception as e:
        logger.warning(f"No se pudo conectar a Microsoft SQL Server ({e}). Activando fallback local SQLite.")
        sqlite_path = os.path.join(os.path.dirname(__file__), "echo_local.db")
        sqlite_url = f"sqlite+aiosqlite:///{sqlite_path}"
        engine = create_async_engine(sqlite_url, echo=False)
        IS_SQL_SERVER = False
        
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info(f"[OK] Fallback SQLite inicializado con esquema relacional en {sqlite_path}.")

    AsyncSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False
    )
    
    # Seed initial server and default channel if empty
    await seed_initial_data()

async def get_db():
    global AsyncSessionLocal
    if AsyncSessionLocal is None:
        await init_db()
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def seed_initial_data():
    from backend.models import UserModel, ServerModel, ChannelModel, RoleModel, ServerMemberModel, MemberRoleModel
    from backend.auth import get_password_hash
    from backend.permissions import PermissionFlags
    
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        result = await session.execute(select(ServerModel))
        server = result.scalars().first()
        if not server:
            logger.info("Inicializando servidor y canales por defecto...")
            # Create system admin user
            admin_user = UserModel(
                Username="admin",
                DisplayName="Echo Admin",
                PasswordHash=get_password_hash("EchoAdmin2026!"),
                AvatarURL="https://api.dicebear.com/7.x/bottts/svg?seed=EchoAdmin",
                BannerColor="#5865F2",
                StatusText="Echo Developer & Arquitecto"
            )
            session.add(admin_user)
            await session.flush()
            
            # Create Demo User
            demo_user = UserModel(
                Username="greco",
                DisplayName="Greco Pro",
                PasswordHash=get_password_hash("greco1234"),
                AvatarURL="https://api.dicebear.com/7.x/avataaars/svg?seed=Greco",
                BannerColor="#23a55a",
                StatusText="Probando Echo Multiplataforma"
            )
            session.add(demo_user)
            await session.flush()

            # Create default server
            default_server = ServerModel(
                Name="Echo Central",
                IconURL="https://api.dicebear.com/7.x/identicon/svg?seed=EchoCentral",
                OwnerID=admin_user.UserID
            )
            session.add(default_server)
            await session.flush()

            # Create default roles
            admin_role = RoleModel(
                ServerID=default_server.ServerID,
                Name="Administrador",
                ColorHex="#FEE75C",
                Position=10,
                PermissionsBitmask=PermissionFlags.ALL
            )
            member_role = RoleModel(
                ServerID=default_server.ServerID,
                Name="Miembro",
                ColorHex="#5865F2",
                Position=1,
                PermissionsBitmask=PermissionFlags.VIEW_CHANNELS | PermissionFlags.SEND_MESSAGES | PermissionFlags.SEND_VOICE_NOTES | PermissionFlags.ATTACH_FILES | PermissionFlags.USE_CUSTOM_EMOJIS_STICKERS | PermissionFlags.CONNECT_VOICE | PermissionFlags.STREAM_VIDEO_SCREEN
            )
            session.add_all([admin_role, member_role])
            await session.flush()

            # Create default channels
            general_channel = ChannelModel(
                ServerID=default_server.ServerID,
                Name="general",
                ChannelType="TEXT",
                Position=0
            )
            voice_channel = ChannelModel(
                ServerID=default_server.ServerID,
                Name="Sala de Voz Principal",
                ChannelType="VOICE_VIDEO",
                Position=1
            )
            session.add_all([general_channel, voice_channel])
            await session.flush()

            # Add memberships
            admin_member = ServerMemberModel(ServerID=default_server.ServerID, UserID=admin_user.UserID)
            demo_member = ServerMemberModel(ServerID=default_server.ServerID, UserID=demo_user.UserID)
            session.add_all([admin_member, demo_member])
            await session.flush()

            # Assign roles
            session.add(MemberRoleModel(ServerID=default_server.ServerID, UserID=admin_user.UserID, RoleID=admin_role.RoleID))
            session.add(MemberRoleModel(ServerID=default_server.ServerID, UserID=demo_user.UserID, RoleID=member_role.RoleID))
            
            await session.commit()
            logger.info("[OK] Servidor por defecto 'Echo Central' y canales configurados.")
