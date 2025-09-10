// // 

// import React, { useContext, useEffect, useState } from "react";
// import { AuthContext } from "../context/AuthContext";
// import Navbar from "../components/Layout/Navbar";
// import RoomList from "../components/Layout/RoomList";
// import ChatWindow from "../components/Chat/ChatWindow";
// import MessageInput from "../components/Chat/MessageInput";
// import NewRoomModal from "../components/Modals/NewRoomModal";

// export default function ChatPage() {
//   const { user, access, logout } = useContext(AuthContext);
//   const [rooms, setRooms] = useState([]);
//   const [currentRoom, setCurrentRoom] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [ws, setWs] = useState(null);
//   const [showModal, setShowModal] = useState(false);

//   // Fetch existing rooms
//   useEffect(() => {
//     fetch("/rooms/", { headers: { Authorization: `Bearer ${access}` } })
//       .then((res) => res.json())
//       .then((data) => setRooms(data));
//   }, [access]);

//   const connectRoom = (room) => {
//     setCurrentRoom(room);
//     setMessages([]);
//     if (ws) ws.close();

//     const socket = new WebSocket(
//       `ws://127.0.0.1:8001/ws/chat/${room.id}?token=${access}`
//     );

//     socket.onmessage = (ev) => {
//       const data = JSON.parse(ev.data);
//       if (data.type === "history") setMessages(data.messages);
//       if (data.type === "message")
//         setMessages((prev) => [...prev, data.message]);
//     };

//     setWs(socket);
//   };

//   const sendMsg = (text) => {
//     if (ws && ws.readyState === WebSocket.OPEN) {
//       ws.send(JSON.stringify({ type: "message", content: text }));
//     }
//   };

//   return (
//     <div className="chat-layout">
//       {/* Pass setShowModal to Navbar */}
//       <Navbar onAddRoom={() => setShowModal(true)} onLogout={logout} />

//       <div className="main-content">
//         <RoomList
//           rooms={rooms}
//           currentRoom={currentRoom}
//           onSelectRoom={connectRoom}
//         />

//         <main className="chat-main">
         
//           {currentRoom ? (
//             <>
//             <div className="chat-header">
//              {currentRoom.room_type === "private"
//               ? currentRoom.participants.find((p) => p.id !== user.id)?.username || "Private"
//               : currentRoom.name}
//       </div>
//               <ChatWindow messages={messages} user={user} room={currentRoom} />
//               <MessageInput onSend={sendMsg} />
//             </>
//           ) : (
//             <div className="empty">Select a room</div>
//           )}
//         </main>
        
//       </div>

//       {/* Show modal when "New Room" clicked */}
//       {showModal && (
//         <NewRoomModal
//           onClose={() => setShowModal(false)}
//           onRoomCreated={(room) => setRooms((prev) => [...prev, room])}
//         />
//       )}
//     </div>
//   );
// }


import React, { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import Navbar from "../components/Layout/Navbar";
import RoomList from "../components/Layout/RoomList";
import ChatWindow from "../components/Chat/ChatWindow";
import MessageInput from "../components/Chat/MessageInput";
import NewRoomModal from "../components/Modals/NewRoomModal";

/**
 * Frontend-only unread implementation:
 * - lastSeen[roomId] stores ISO timestamp of last read message for that room (persisted to localStorage)
 * - unreadCounts[roomId] stores number of unread messages (persisted to localStorage)
 *
 * Messages must include `created_at` (ISO string) and `room` (room id) and `sender` (username or id).
 */

const LS_LAST_SEEN = "echo_last_seen_messages";
const LS_UNREAD_COUNTS = "echo_unread_counts";

export default function ChatPage() {
  const { user, refresh, access, logout } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // persisted maps
  const [lastSeen, setLastSeen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_LAST_SEEN) || "{}");
    } catch {
      return {};
    }
  });
  const [unreadCounts, setUnreadCounts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_UNREAD_COUNTS) || "{}");
    } catch {
      return {};
    }
  });

  // used to tell ChatWindow which message to scroll to (first unread), or null -> scroll bottom
  const [scrollToMessageId, setScrollToMessageId] = useState(null);

  // helper to persist
  useEffect(() => {
    localStorage.setItem(LS_LAST_SEEN, JSON.stringify(lastSeen));
  }, [lastSeen]);
  useEffect(() => {
    localStorage.setItem(LS_UNREAD_COUNTS, JSON.stringify(unreadCounts));
  }, [unreadCounts]);

  // load rooms on mount
  useEffect(() => {
    if (!access) return;
    fetch("/rooms/", { headers: { Authorization: `Bearer ${access}` } })
      .then((res) => res.json())
      .then((data) => {
        // keep any unread counts from storage; also keep last_message if backend provides
        const initial = (data || []).map((r) => ({ ...r }));
        setRooms(initial);

        // ensure unreadCounts has keys for each room
        const updated = { ...unreadCounts };
        initial.forEach((r) => {
          if (updated[r.id] == null) updated[r.id] = 0;
        });
        setUnreadCounts(updated);
      })
      .catch((err) => console.error("fetch rooms error", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  // helper to test whether msg is from current user
  const isMessageFromMe = (msg) => {
    if (!user) return false;
    // msg.sender may be username or id or object
    if (typeof msg.sender === "string") return msg.sender === user.username;
    if (typeof msg.sender === "number") return Number(msg.sender) === Number(user.id);
    if (typeof msg.sender === "object" && msg.sender !== null) {
      return msg.sender.username === user.username || Number(msg.sender.id) === Number(user.id);
    }
    return false;
  };

  // helper to compare created_at timestamps
  const isAfter = (msgCreatedAt, baselineIso) => {
    if (!msgCreatedAt) return false;
    if (!baselineIso) return true; // treat everything as unread if no baseline
    try {
      return new Date(msgCreatedAt) > new Date(baselineIso);
    } catch {
      return true;
    }
  };

  const connectRoom = (room) => {
    // open room and reset unread counter for this room
    setCurrentRoom(room);
    setUnreadCounts((prev) => ({ ...prev, [room.id]: 0 }));

    setMessages([]);
    setScrollToMessageId(null);
    if (ws) ws.close();

    const socket = new WebSocket(
      `ws://127.0.0.1:8001/ws/chat/${room.id}?refresh=${refresh}`
    );

    socket.onopen = () => {
      console.log("WS connected to room", room.id);
    };

    socket.onmessage = (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        console.warn("WS: non-json message", ev.data);
        return;
      }

      // history arrives
      if (data.type === "history") {
        const hist = data.messages || [];
        setMessages(hist);

        // compute first unread using previous lastSeen (persisted)
        const prevLastSeen = lastSeen[String(room.id)] || null;
        const firstUnread = hist.find((m) => isAfter(m.created_at, prevLastSeen));
        setScrollToMessageId(firstUnread ? firstUnread.id : null);

        // now mark as read by updating lastSeen to latest message created_at (so unread disappears)
        if (hist.length > 0) {
          const latest = hist[hist.length - 1];
          setLastSeenForRoom(room.id, latest.created_at);
        }
      }

      // single new message arrives
      if (data.type === "message") {
        const m = data.message;
        // add to messages if current room
        if (Number(m.room) === Number(room.id) || String(m.room) === String(room.id)) {
          setMessages((prev) => [...prev, m]);
          // if user is viewing the room, treat as read (no unread increment) and scroll to bottom
          // auto scroll handled in ChatWindow below
        } else {
          // different room: increment unread only if not from me
          if (!isMessageFromMe(m)) {
            setUnreadCounts((prev) => {
              const next = { ...(prev || {}) };
              next[m.room] = (next[m.room] || 0) + 1;
              return next;
            });
          }
          // also update rooms last_message preview
          setRooms((prev) =>
            prev.map((r) => (r.id === m.room ? { ...r, last_message: m.content } : r))
          );
        }
      }
    };

    socket.onclose = () => console.log("WS closed for room", room.id);
    socket.onerror = (err) => console.error("WS error", err);

    setWs(socket);
  };

  // set lastSeen helper
  const setLastSeenForRoom = (roomId, isoTimestamp) => {
    setLastSeen((prev) => {
      const next = { ...(prev || {}) };
      next[String(roomId)] = isoTimestamp;
      return next;
    });
  };

  // When user selects a room in the list, also mark unread = 0 and set lastSeen after history loads (handled in ws onmessage)
  // But if you want to explicitly mark read immediately (no wait), you can:
  const markRoomReadNow = (roomId) => {
    // uses latest message timestamp if known (rooms may have last_message)
    const r = rooms.find((x) => Number(x.id) === Number(roomId));
    if (r && r.last_message && r.last_message.created_at) {
      setLastSeenForRoom(roomId, r.last_message.created_at);
    }
    setUnreadCounts((prev) => ({ ...prev, [roomId]: 0 }));
  };

  const sendMsg = (text) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "message", content: text }));
    }
  };

  return (
    <div className="chat-layout">
      
      <Navbar onAddRoom={() => setShowModal(true)} onLogout={logout} />
      <div className="main-content">
        
     
        <RoomList
          rooms={rooms.map((r) => ({ ...r, unread: unreadCounts[r.id] || 0 }))}
          currentRoom={currentRoom}
          onSelectRoom={(room) => {
            connectRoom(room);
            markRoomReadNow(room.id); // immediate best-effort mark read
          }}
        />

        <main className="chat-main">
          {currentRoom ? (
            <>
              <div className="chat-header">
                <div className="chat-header-left">
                  {/* show other user for private or name for group */}
                  {currentRoom.room_type === "private" ? (
                    <>
                      <img
                        className="avatar"
                        src={
                          (currentRoom.participants || []).find((p) => String(p.id) !== String(user?.id))?.avatar ||
                          "/default-avatar.png"
                        }
                        alt="avatar"
                      />
                      <h3>
                        {(currentRoom.participants || []).find((p) => String(p.id) !== String(user?.id))?.username ||
                          "Private"}
                      </h3>
                    </>
                  ) : (
                    <>
                      <img className="avatar" src={currentRoom.room_type == "private" ? "/default-avatar.png" : "/default-avatar-group.png"} alt="avatar" />
                      <h3>{currentRoom.name}</h3>
                    </>
                  )}
                </div>
                <div className="chat-header-right">{/* optional controls */}</div>
              </div>

              <ChatWindow
                messages={messages}
                user={user}
                room={currentRoom}
                scrollToMessageId={scrollToMessageId}
                onScrolledToUnread={() => {
                  // after scrolling to unread we mark room read by saving lastSeen to latest message
                  const latest = messages[messages.length - 1];
                  if (latest) setLastSeenForRoom(currentRoom.id, latest.created_at);
                  setUnreadCounts((prev) => ({ ...prev, [currentRoom.id]: 0 }));
                  setScrollToMessageId(null); // clear intent
                }}
              />

              <MessageInput onSend={sendMsg} />
            </>
          ) : (
            <div className="empty">Select a room</div>
          )}
        </main>
      </div>

      {showModal && (
        <NewRoomModal
          onClose={() => setShowModal(false)}
          onRoomCreated={(room) => {
            setRooms((prev) => [...prev, { ...room }]);
            setUnreadCounts((prev) => ({ ...(prev || {}), [room.id]: 0 }));
          }}
        />
      )}
    </div>
  );
}
