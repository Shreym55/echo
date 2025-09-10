import React from "react";

export default function RoomList({ rooms, currentRoom, onSelectRoom }) {
  return (
    <div className="room-list">
      {rooms.map((room) => (
        <div
          key={room.id}
          className={`room-item ${currentRoom?.id === room.id ? "active" : ""}`}
          onClick={() => onSelectRoom(room)}
        >
          {room.name}
        </div>
      ))}
    </div>
  );
}
