import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

export default function NewRoomModal({ onClose, onRoomCreated }) {
  const { access, user } = useContext(AuthContext);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("group");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // fetch all users except self
  useEffect(() => {
    fetch("/auth/users/", {
      headers: { Authorization: `Bearer ${access}` },
    })
      .then((res) => res.json())
      .then((data) => setUsers(data.filter((u) => u.id !== user.id)));
  }, [access, user]);

  const toggleUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const createRoom = async () => {
    if (roomType === "private" && selectedUsers.length !== 1) {
      alert("Private chat must have exactly one other user");
      return;
    }

    const res = await fetch("/rooms/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({
        name: roomType === "private" ? "" : roomName,
        room_type: roomType,
        participants: selectedUsers,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      onRoomCreated(data);
      onClose();
    } else {
      alert("Failed to create room");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Create New Room</h3>
        <input
          placeholder="Room name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          disabled={roomType === "private"}
        />
        <select
          value={roomType}
          onChange={(e) => setRoomType(e.target.value)}
        >
          <option value="group">Group</option>
          <option value="private">Private</option>
        </select>

        <div className="user-list">
          {users.map((u) => (
            <label key={u.id} className="user-checkbox">
              <input
                type="checkbox"
                checked={selectedUsers.includes(u.id)}
                onChange={() => toggleUser(u.id)}
                disabled={roomType === "private" && selectedUsers.length === 1 && !selectedUsers.includes(u.id)}
              />
              {u.username}
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button onClick={createRoom}>Create</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
