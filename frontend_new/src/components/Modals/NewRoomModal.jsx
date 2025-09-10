import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

export default function NewRoomModal({ onClose, onRoomCreated }) {
  const { access, user } = useContext(AuthContext);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("group");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/auth/users/", {
      headers: { Authorization: `Bearer ${access}` },
    })
      .then((res) => res.json())
      .then((data) => setUsers(data.filter((u) => u.id !== user.id)));
  }, [access, user]);

  const toggleUser = (id) => {
    if (roomType === "private") {
      // allow only one selection
      setSelectedUsers(selectedUsers.includes(id) ? [] : [id]);
    } else {
      setSelectedUsers((prev) =>
        prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
      );
    }
  };

  const createRoom = async () => {
  setError("");

  if (roomType === "private" && selectedUsers.length !== 1) {
    setError("Private chat must have exactly one other user");
    return;
  }
  if (roomType === "group" && !roomName.trim()) {
    setError("Group room must have a name");
    return;
  }

  let res, data;

  if (roomType === "private") {
    // Use your PrivateRoomView endpoint
    res = await fetch("/rooms/private/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({ user_id: selectedUsers[0] }),
    });
  } else {
    // Normal group creation
    res = await fetch("/rooms/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({
        name: roomName,
        room_type: "group",
        participants: selectedUsers,
      }),
    });
  }

  data = await res.json();
  if (res.ok) {
    onRoomCreated(data);
    onClose();
  } else {
    setError(data.error || "Failed to create room");
  }
};

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Create New Room</h3>
        {roomType === "group" && (
          <input
            placeholder="Room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
        )}

        <select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
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

        {error && <p style={{ color: "red" }}>{error}</p>}

        <div className="modal-actions">
          <button onClick={createRoom}>Create</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
