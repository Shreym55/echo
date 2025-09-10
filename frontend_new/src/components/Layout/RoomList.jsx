
import React, { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

export default function RoomList({ rooms, currentRoom, onSelectRoom }) {
  const { user } = useContext(AuthContext);

  return (
    <div className="room-list-container" >
    <div className="room-list-header"><h3>Chats</h3></div>
    <div className="room-list">
      {rooms.map((room) => {
        // 👇 if it's private, pick the participant who is NOT me
        const displayName =
          room.room_type === "private"
            ? room.participants.find((p) => p.id !== user.id)?.username || "Private"
            : room.name;

        return (
          
          <div
            key={room.id}
            className={`room-item ${currentRoom?.id === room.id ? "active" : ""}`}
            onClick={() => onSelectRoom(room)}
          > 
            <div className="room-header">
              <><img className="room-avatar" src={room.room_type == "private" ? "/default-avatar.png" : "/default-avatar-group.png"} alt="avatar" /></>
              <span className="room-name">{displayName}</span>
              {room.unread > 0 && (
                <span className="unread-badge">{room.unread}</span>
              )}
            </div>
            <div className="room-last">
              {/* {room.last_message ? room.last_message : "No messages yet"} */}
            </div>
          </div>
        );
      })}
    </div> </div>
  );
}



