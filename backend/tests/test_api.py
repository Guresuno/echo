import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.database import init_db
from backend.permissions import PermissionFlags, has_permission, combine_permissions
from backend.audio_processor import extract_waveform_peaks
from backend.livekit_service import generate_livekit_token

@pytest.mark.asyncio
async def test_bitwise_permissions():
    # Verify bitwise definitions
    assert PermissionFlags.VIEW_CHANNELS == 1
    assert PermissionFlags.SEND_MESSAGES == 2
    assert PermissionFlags.SEND_VOICE_NOTES == 4
    assert PermissionFlags.ATTACH_FILES == 8
    assert PermissionFlags.USE_CUSTOM_EMOJIS_STICKERS == 16
    assert PermissionFlags.MANAGE_EMOJIS_STICKERS == 32
    assert PermissionFlags.CONNECT_VOICE == 64
    assert PermissionFlags.STREAM_VIDEO_SCREEN == 128
    assert PermissionFlags.MANAGE_ROLES == 256
    assert PermissionFlags.ADMINISTRATOR == 512

    # Normal user with view + send
    user_mask = PermissionFlags.VIEW_CHANNELS | PermissionFlags.SEND_MESSAGES
    assert has_permission(user_mask, PermissionFlags.VIEW_CHANNELS) is True
    assert has_permission(user_mask, PermissionFlags.SEND_MESSAGES) is True
    assert has_permission(user_mask, PermissionFlags.SEND_VOICE_NOTES) is False

    # Admin override
    admin_mask = PermissionFlags.ADMINISTRATOR
    assert has_permission(admin_mask, PermissionFlags.SEND_VOICE_NOTES) is True
    assert has_permission(admin_mask, PermissionFlags.STREAM_VIDEO_SCREEN) is True

    # Combine roles
    role1 = PermissionFlags.VIEW_CHANNELS
    role2 = PermissionFlags.CONNECT_VOICE
    combined = combine_permissions([role1, role2])
    assert combined == (1 | 64)

@pytest.mark.asyncio
async def test_audio_waveform_peaks():
    # Synthetic audio bytes
    raw_audio = b"\x00\x10\x20\x30\x40\x50\x60\x70" * 100
    peaks = extract_waveform_peaks(raw_audio, num_peaks=40)
    assert len(peaks) == 40
    for p in peaks:
        assert 0.0 <= p <= 1.0

@pytest.mark.asyncio
async def test_livekit_token_generation():
    token = generate_livekit_token(
        room_name="test_voice_room",
        user_id=1,
        identity="tester",
        display_name="Tester Display",
        can_publish=True
    )
    assert token is not None
    assert len(token) > 20

@pytest.mark.asyncio
async def test_api_full_flow():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Check root health
        res = await client.get("/")
        assert res.status_code == 200
        assert res.json()["status"] == "ONLINE"

        # 1. Register new user with Hardware ID
        import uuid
        uid = uuid.uuid4().hex[:6]
        uname = f"test_{uid}"
        hwid = f"TEST-HWID-{uid}"
        reg_payload = {
            "Username": uname,
            "DisplayName": f"Test User {uid}",
            "Password": "SuperPassword123!",
            "HardwareID": hwid,
            "DeviceName": "Windows Test PC",
            "PlatformType": "PC_DESKTOP"
        }
        reg_res = await client.post("/auth/register", json=reg_payload)
        assert reg_res.status_code == 200
        token_data = reg_res.json()
        assert "AccessToken" in token_data
        assert token_data["User"]["Username"] == uname
        access_token = token_data["AccessToken"]

        # 2. Test Zero-Click Auto-Login with HardwareID
        auto_res = await client.post("/auth/auto-login", json={"HardwareID": hwid})
        assert auto_res.status_code == 200
        assert auto_res.json()["User"]["Username"] == uname

        # 3. List Servers
        headers = {"Authorization": f"Bearer {access_token}"}
        srv_res = await client.get("/servers", headers=headers)
        assert srv_res.status_code == 200

        # 4. Create new Server
        new_srv_res = await client.post("/servers", json={"Name": "Comunidad Alfa"}, headers=headers)
        assert new_srv_res.status_code == 200
        server_id = new_srv_res.json()["ServerID"]

        # 5. List channels in server
        chan_res = await client.get(f"/servers/{server_id}/channels", headers=headers)
        assert chan_res.status_code == 200
        channels = chan_res.json()
        assert len(channels) >= 2
        text_chan = [c for c in channels if c["ChannelType"] == "TEXT"][0]

        # 6. Send text message
        msg_payload = {
            "Content": "¡Hola a todos en Echo! Probando mensaje <:party:1>",
            "MessageType": "DEFAULT"
        }
        msg_res = await client.post(f"/channels/{text_chan['ChannelID']}/messages", json=msg_payload, headers=headers)
        assert msg_res.status_code == 200
        assert msg_res.json()["SenderDisplayName"] == f"Test User {uid}"
