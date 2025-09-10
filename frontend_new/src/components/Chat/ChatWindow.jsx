import React from "react";

export default function ChatWindow({ messages, user, room }) {
  return (
    <div className="chat-window">
      <h3 className="chat-room-title">{room.name}</h3>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`msg ${msg.sender === user?.username ? "me" : "other"}`}
        >
          <strong>{msg.sender}</strong>
          <div>{msg.content}</div>
        </div>
      ))}
    </div>
  );
}
