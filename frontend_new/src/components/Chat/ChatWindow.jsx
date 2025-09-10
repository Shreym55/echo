// import React from "react";

// export default function ChatWindow({ messages, user, room }) {
//   return (
//     <div className="chat-window">
//       {/* <h3 className="chat-room-title">{room.room_type === "private"
//             ? room.participants.find((p) => p.id !== user.id)?.username || "Private"
//             : room.name}</h3> */}
//       {messages.map((msg) => (
//         <div
//           key={msg.id}
//           className={`msg ${msg.sender === user?.username ? "me" : "other"}`}
//         >
//           {/* <strong>{msg.sender}</strong> */}
//           <div className="sender-title">
//            {msg.sender} </div> 

//           <div>{msg.content}</div>
//         </div>
//       ))}
//     </div>
//   );
// }


import React, { useEffect, useRef } from "react";

/**
 * Props:
 *  - messages: array of { id, sender, content, created_at, room }
 *  - user: current user object (id or username)
 *  - room: current room
 *  - scrollToMessageId: id of message to scroll to (first unread) OR null
 *  - onScrolledToUnread: callback invoked after we scroll to unread
 *
 * ChatWindow will:
 *  - render each message with an element id/data-msgid
 *  - when scrollToMessageId present -> scroll that message into view
 *  - if scrollToMessageId is null and messages change -> scroll to bottom
 */

export default function ChatWindow({ messages = [], user, room, scrollToMessageId, onScrolledToUnread }) {
  const containerRef = useRef(null);
  const msgRefs = useRef({});

  // store ref handle for each message
  const setRef = (id) => (el) => {
    if (el) msgRefs.current[String(id)] = el;
  };

  // when messages change, either scroll to target id or scroll to bottom
  useEffect(() => {
    if (!containerRef.current) return;

    if (scrollToMessageId) {
      const el = msgRefs.current[String(scrollToMessageId)];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        // notify parent that we've scrolled to unread — parent may update lastSeen
        onScrolledToUnread && setTimeout(() => onScrolledToUnread(), 250);
        return;
      }
    }

    // otherwise scroll to bottom
    const container = containerRef.current;
    container.scrollTop = container.scrollHeight;
  }, [messages, scrollToMessageId, onScrolledToUnread]);

  const isMine = (msg) => {
    if (!user) return false;
    if (typeof msg.sender === "string") return msg.sender === user.username;
    if (typeof msg.sender === "number") return Number(msg.sender) === Number(user.id);
    if (typeof msg.sender === "object" && msg.sender !== null) {
      return msg.sender.username === user.username || Number(msg.sender.id) === Number(user.id);
    }
    return false;
  };

  return (
    <div className="chat-window" ref={containerRef}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          ref={setRef(msg.id)}
          data-msgid={msg.id}
          className={`msg ${isMine(msg) ? "me" : "other"}`}
        >
          <div className="msg-sender">
            {typeof msg.sender === "string"
              ? msg.sender
              : (msg.sender && (msg.sender.username || msg.sender.id)) || "User"}
          </div>
          <div className="msg-text">{msg.content}</div>
          <div className="msg-time">
    {msg.created_at
      ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : ""}
  </div>

        </div>
      ))}
    </div>
  );
}
