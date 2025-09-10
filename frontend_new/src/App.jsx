import React, { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";

export default function App() {
  const { user } = useContext(AuthContext);
  return user ? <ChatPage /> : <LoginPage />;
}
