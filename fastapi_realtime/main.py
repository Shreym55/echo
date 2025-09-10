import sys
import pathlib
import os
import json
from typing import Dict, List, Tuple
from urllib.parse import parse_qs

# --- Setup Django environment ---
BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR / "backend"))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

# Django imports
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from chat.models import Room, Message

# SimpleJWT
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

# FastAPI imports
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from starlette.concurrency import run_in_threadpool

app = FastAPI(title="Realtime Chat (FastAPI)")


# --- Connection Manager with presence ---
class ConnectionManager:
    def __init__(self):
        # room_id -> list of (user_id, username, websocket)
        self.active_connections: Dict[int, List[Tuple[int, str, WebSocket]]] = {}

    async def connect(self, websocket: WebSocket, room_id: int, user_id: int, username: str):
        
        # await websocket.accept()
        conns = self.active_connections.setdefault(room_id, [])
        conns.append((user_id, username, websocket))

    def disconnect(self, websocket: WebSocket, room_id: int):
        conns = self.active_connections.get(room_id, [])
        for tup in conns:
            if tup[2] is websocket:
                conns.remove(tup)
                break
        if not conns:
            self.active_connections.pop(room_id, None)

    def list_users(self, room_id: int) -> List[str]:
        """Return list of usernames online in the room"""
        return [username for (_, username, _) in self.active_connections.get(room_id, [])]

    async def broadcast_json(self, room_id: int, payload: dict):
        conns = self.active_connections.get(room_id, [])
        for (_, _, ws) in list(conns):
            try:
                await ws.send_json(payload)
            except Exception:
                pass


manager = ConnectionManager()


# --- Helpers ---
def get_user_from_token(token_str: str) -> User:
    try:
        token = AccessToken(token_str)
    except TokenError as e:
        raise ValueError("invalid token") from e

    user_id = token.get("user_id")
    if not user_id:
        raise ValueError("token missing user_id")

    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist as e:
        raise ValueError("user not found") from e


def is_user_in_room(room: Room, user: User) -> bool:
    return room.participants.filter(id=user.id).exists()


def create_and_save_message(room: Room, sender: User, content: str) -> dict:
    msg = Message.objects.create(room=room, sender=sender, content=content)
    return {
        "id": msg.id,
        "room": msg.room.id,
        "sender": sender.username,
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }


# --- WebSocket Endpoint ---
import asyncio
import datetime
from rest_framework_simplejwt.tokens import RefreshToken
from jwt import decode as jwt_decode, ExpiredSignatureError
from django.conf import settings

# @app.websocket("/ws/chat/{room_id}")
@app.websocket("/ws/chat/{room_id}")
async def websocket_chat(websocket: WebSocket, room_id: int):
    """
    Connect with either:
      ws://localhost:8001/ws/chat/<room_id>?token=<ACCESS_TOKEN>
    or
      ws://localhost:8001/ws/chat/<room_id>?refresh=<REFRESH_TOKEN>
    """

    await websocket.accept()  # ✅ accept early so errors can be sent back

    try:
        # --- Parse query params ---
        query = websocket.scope.get("query_string", b"").decode()
        qs = parse_qs(query)
        access_list = qs.get("token") or qs.get("access") or []
        refresh_list = qs.get("refresh") or []
        access_token = access_list[0] if access_list else None
        refresh_token = refresh_list[0] if refresh_list else None

        print("🔍 Received tokens:", {"access": bool(access_token), "refresh": bool(refresh_token)})

        # --- Validate and get user ---
        user = None
        if access_token:
            try:
                user = await run_in_threadpool(get_user_from_token, access_token)
            except Exception as e:
                print("⚠️ Invalid access token:", e)
                if refresh_token:
                    try:
                        refresh_obj = RefreshToken(refresh_token)
                        user_id = refresh_obj.get("user_id")
                        user = await run_in_threadpool(lambda: User.objects.get(id=user_id))
                        access_token = str(refresh_obj.access_token)
                    except Exception as e2:
                        print("❌ Refresh failed:", e2)
                        await websocket.send_json({"error": "invalid_token"})
                        await websocket.close()
                        return
                else:
                    await websocket.send_json({"error": "missing_or_invalid_token"})
                    await websocket.close()
                    return
        elif refresh_token:
            try:
                refresh_obj = RefreshToken(refresh_token)
                user_id = refresh_obj.get("user_id")
                user = await run_in_threadpool(lambda: User.objects.get(id=user_id))
                access_token = str(refresh_obj.access_token)
            except Exception as e:
                print("❌ Refresh only connect failed:", e)
                await websocket.send_json({"error": "invalid_refresh"})
                await websocket.close()
                return
        else:
            await websocket.send_json({"error": "no_token_provided"})
            await websocket.close()
            return

        # --- Room validation ---
        try:
            room = await run_in_threadpool(lambda: get_object_or_404(Room, id=room_id))
        except Exception as e:
            print("❌ Room not found:", e)
            await websocket.send_json({"error": "room_not_found"})
            await websocket.close()
            return

        allowed = await run_in_threadpool(is_user_in_room, room, user)
        if not allowed:
            print(f"❌ User {user.username} not in room {room_id}")
            await websocket.send_json({"error": "not_in_room"})
            await websocket.close()
            return

        # --- Register connection ---
        await manager.connect(websocket, room_id, user.id, user.username)
        # --- Send last 20 messages as history ---
        recent_messages = await run_in_threadpool(
            lambda: list(
                Message.objects.filter(room=room)
                .select_related("sender")
                .order_by("-created_at")[:20]
            )
        )

        # reverse so oldest first
        recent_messages.reverse()

        history = [
            {
                "id": m.id,
                "content": m.content,
                "sender": m.sender.username,
                "timestamp": m.created_at.isoformat(),
            }
            for m in recent_messages
        ]

        await websocket.send_json({
            "type": "history",
            "messages": history,
        })

        await manager.broadcast_json(room_id, {
            "type": "user.join",
            "user": user.username,
        })
        await manager.broadcast_json(room_id, {
            "type": "users.online",
            "users": manager.list_users(room_id),
        })

        # --- Main message loop ---
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except Exception:
                data = {"type": "message", "content": raw}

            if data.get("type") == "message":
                content = data.get("content", "").strip()
                if not content:
                    continue

                saved = await run_in_threadpool(create_and_save_message, room, user, content)
                await manager.broadcast_json(room_id, {"type": "message", "message": saved})

            elif data.get("type") == "typing":
                await manager.broadcast_json(room_id, {"type": "typing", "user": user.username})

            else:
                await manager.broadcast_json(room_id, {"type": "unknown", "raw": data})

    except WebSocketDisconnect:
        print(f"ℹ️ User {user.username if user else 'Unknown'} disconnected from room {room_id}")
        manager.disconnect(websocket, room_id)
        await manager.broadcast_json(room_id, {"type": "user.leave", "user": user.username if user else "?"})
        await manager.broadcast_json(room_id, {"type": "users.online", "users": manager.list_users(room_id)})

    except Exception as e:
        print("🔥 Unexpected WebSocket error:", e)
        await websocket.close()
