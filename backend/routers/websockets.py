import json
import asyncio
import uuid
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.auth import decode_token
from backend.cache import cache

router = APIRouter(tags=["WebSockets & Realtime Signaling"])

# Connection Managers
class ChannelRoomManager:
    def __init__(self):
        self.rooms: Dict[int, Set[WebSocket]] = {}

    async def connect(self, channel_id: int, ws: WebSocket):
        await ws.accept()
        if channel_id not in self.rooms:
            self.rooms[channel_id] = set()
        self.rooms[channel_id].add(ws)

    def disconnect(self, channel_id: int, ws: WebSocket):
        if channel_id in self.rooms:
            self.rooms[channel_id].discard(ws)
            if not self.rooms[channel_id]:
                del self.rooms[channel_id]

    async def broadcast(self, channel_id: int, message: dict):
        if channel_id in self.rooms:
            dead = set()
            for ws in self.rooms[channel_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.rooms[channel_id].discard(ws)

channel_manager = ChannelRoomManager()

# Global Presence WebSocket
class PresenceManager:
    def __init__(self):
        self.connections: Dict[WebSocket, tuple[int, str]] = {}

    async def connect(self, ws: WebSocket):
        await ws.accept()

    async def register(self, ws: WebSocket, user_id: int, platform: str):
        self.connections[ws] = (user_id, platform)
        await cache.track_user_connect(user_id, platform)
        await self.broadcast({
            "type": "PRESENCE_UPDATE",
            "user_id": user_id,
            "status": "online",
            "platforms": await cache.get_user_platforms(user_id)
        })

    async def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            user_id, platform = self.connections.pop(ws)
            await cache.track_user_disconnect(user_id, platform)
            await self.broadcast({
                "type": "PRESENCE_UPDATE",
                "user_id": user_id,
                "status": await cache.get_user_status(user_id),
                "platforms": await cache.get_user_platforms(user_id)
            })

    async def broadcast(self, message: dict):
        dead = set()
        for ws in list(self.connections.keys()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.connections.pop(ws, None)

presence_manager = PresenceManager()

@router.websocket("/ws/presence")
async def ws_presence(websocket: WebSocket):
    await presence_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "AUTH":
                token = data.get("token")
                platform = data.get("platform_info", "PC_DESKTOP")
                payload = decode_token(token) if token else None
                if payload:
                    user_id = int(payload["sub"])
                    await presence_manager.register(websocket, user_id, platform)
                else:
                    await websocket.send_json({"type": "ERROR", "message": "Token inválido"})
            elif msg_type == "PING":
                await websocket.send_json({"type": "PONG"})
    except WebSocketDisconnect:
        await presence_manager.disconnect(websocket)
    except Exception:
        await presence_manager.disconnect(websocket)

@router.websocket("/ws/chat/{channel_id}")
async def ws_chat(websocket: WebSocket, channel_id: int):
    await channel_manager.connect(channel_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "CHAT_MESSAGE":
                await channel_manager.broadcast(channel_id, {
                    "type": "NEW_MESSAGE",
                    "channel_id": channel_id,
                    "message": data.get("message")
                })
            elif msg_type == "TYPING":
                await channel_manager.broadcast(channel_id, {
                    "type": "USER_TYPING",
                    "channel_id": channel_id,
                    "user_id": data.get("user_id"),
                    "display_name": data.get("display_name")
                })
    except WebSocketDisconnect:
        channel_manager.disconnect(channel_id, websocket)
    except Exception:
        channel_manager.disconnect(channel_id, websocket)

@router.websocket("/ws/qr-login")
async def ws_qr_login(websocket: WebSocket):
    """
    PC QR Code Login Protocol:
    1. PC opens WS, sends INIT with HardwareID.
    2. Server generates qr_token, returns QR URL.
    3. Server polls QR status events until mobile approves, then sends tokens and closes.
    """
    await websocket.accept()
    qr_token = str(uuid.uuid4())
    try:
        init_data = await websocket.receive_json()
        hwid = init_data.get("hardware_id", "DESKTOP_UNKNOWN")
        dname = init_data.get("device_name", "PC Escritorio")
        platform = init_data.get("platform_type", "PC_DESKTOP")

        # Save session
        session_info = {
            "status": "PENDING",
            "hardware_id": hwid,
            "device_name": dname,
            "platform_type": platform
        }
        await cache.set_json(f"qr:{qr_token}", session_info, ex=120)

        # Notify PC
        await websocket.send_json({
            "type": "QR_READY",
            "qr_token": qr_token,
            "qr_url": f"miapp://qr-login/{qr_token}",
            "expires_in": 120
        })

        # Loop until approved, scanned, or timeout
        start_time = asyncio.get_event_loop().time()
        current_state = "PENDING"
        while True:
            if asyncio.get_event_loop().time() - start_time > 120:
                await websocket.send_json({"type": "EXPIRED"})
                break

            # Check for event updates
            event_data = await cache.get_json(f"qr_event:{qr_token}")
            if event_data:
                ev_type = event_data.get("event")
                if ev_type == "SCANNED" and current_state != "SCANNED":
                    current_state = "SCANNED"
                    await websocket.send_json({
                        "type": "SCANNED",
                        "user": event_data.get("user"),
                        "message": "Esperando confirmación en tu teléfono..."
                    })
                elif ev_type == "APPROVED":
                    await websocket.send_json({
                        "type": "APPROVED",
                        "payload": event_data.get("payload")
                    })
                    break

            await asyncio.sleep(0.5)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await cache.delete(f"qr:{qr_token}")
        await cache.delete(f"qr_event:{qr_token}")
