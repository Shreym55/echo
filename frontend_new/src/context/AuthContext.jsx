import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [access, setAccess] = useState(localStorage.getItem("access") || "");
  const [refresh, setRefresh] = useState(localStorage.getItem("refresh") || "");
  const [user, setUser] = useState(null);

  const login = async (tokens) => {
    setAccess(tokens.access);
    setRefresh(tokens.refresh);
    localStorage.setItem("access", tokens.access);
    localStorage.setItem("refresh", tokens.refresh);

    const res = await fetch("/auth/me/", {
      headers: { Authorization: `Bearer ${tokens.access}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
    }
  };

  const logout = () => {
    setAccess("");
    setRefresh("");
    setUser(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ access, refresh, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
