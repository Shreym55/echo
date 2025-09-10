import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import Navbar from "../components/Layout/Navbar";
import RoomList from "../components/Layout/RoomList";
import ChatWindow from "../components/Chat/ChatWindow";
import MessageInput from "../components/Chat/MessageInput";

export default function ChatPage() {
  const { user, access, logout } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    fetch("/rooms/", { headers: { Authorization: `Bearer ${access}` } })
      .then((res) => res.json())
      .then((data) => setRooms(data));
  }, [access]);

  const connectRoom = (room) => {
    setCurrentRoom(room);
    setMessages([]);
    if (ws) ws.close();

    const socket = new WebSocket(
      `ws://127.0.0.1:8001/ws/chat/${room.id}?token=${access}`
    );

    socket.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === "history") setMessages(data.messages);
      if (data.type === "message") setMessages((prev) => [...prev, data.message]);
    };

    setWs(socket);
  };

  const sendMsg = (text) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "message", content: text }));
    }
  };

  return (
    <div className="chat-layout">
      <Navbar onLogout={logout} />
      <div className="main-content">
        <RoomList
          rooms={rooms}
          currentRoom={currentRoom}
          onSelectRoom={connectRoom}
        />
        <main className="chat-main">
          {currentRoom ? (
            <>
              <ChatWindow messages={messages} user={user} room={currentRoom} />
              <MessageInput onSend={sendMsg} />
            </>
          ) : (
            <div className="empty">Select a room</div>
          )}
        </main>
      </div>
    </div>
  );
}
