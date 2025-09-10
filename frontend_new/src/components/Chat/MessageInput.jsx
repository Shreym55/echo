// import React, { useState } from "react";

// export default function MessageInput({ onSend }) {
//   const [text, setText] = useState("");

//   const handleSend = () => {
//     if (text.trim()) {
//       onSend(text);
//       setText("");
//     }
//   };

//   return (
//     <div className="input-box">
//       <input
//         type="text"
//         value={text}
//         onChange={(e) => setText(e.target.value)}
//         placeholder="Type a message..."
//       />
//       <button type="button" onClick={handleSend}>
//         Send
//       </button>
//     </div>
//   );
// }




import React, { useState } from "react";

export default function MessageInput({ onSend }) {
  const [text, setText] = useState("");

  const handleSend = (e) => {
    e.preventDefault(); // prevent page reload if inside form
    if (text.trim()) {
      onSend(text);
      setText("");
    }
  };

  return (
    <form className="input-box" onSubmit={handleSend}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
      />
      <button type="submit">Send</button>
    </form>
  );
}
