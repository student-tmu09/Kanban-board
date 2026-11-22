import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentUser, loginUser, registerUser, logoutUser, verifyOtp } from "../Api/authApi";
import { unwrap } from "../utils/response";
import { ensureSocketConnected, socket } from "../Api/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("kanban_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Check auth status on app start
  const checkAuth = useCallback(async () => {
    try {
      const res = await getCurrentUser();
      const data = unwrap(res, null);
      const userData = data?.user || data;
      if (userData && (userData.id || userData._id || userData.email)) {
        const normalized = {
          id: userData.id || userData._id,
          _id: userData._id || userData.id,
          name: userData.name || "",
          email: userData.email || "",
          avatar: userData.avatar || "",
          role: userData.role || ""
        };
        setUser(normalized);
        localStorage.setItem("kanban_user", JSON.stringify(normalized));
        ensureSocketConnected();
      } else {
        setUser(null);
        localStorage.removeItem("kanban_user");
        socket.disconnect();
      }
    } catch (err) {
      setUser(null);
      localStorage.removeItem("kanban_user");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    const res = await loginUser(credentials);
    const body = res.data?.data || res.data;
    const userData = body?.user || {};
    const token = body?.Accesstoken;
    if (token) {
      localStorage.setItem("kanban_token", token);
    }
    const normalized = {
      id: userData.id || userData._id,
      _id: userData._id || userData.id,
      name: userData.name || "",
      email: userData.email || credentials.email,
      avatar: userData.avatar || "",
      role: userData.role || ""
    };
    setUser(normalized);
    localStorage.setItem("kanban_user", JSON.stringify(normalized));
    ensureSocketConnected();
    return res;
  };

  const register = async (userData) => {
    const res = await registerUser(userData);
    const body = res.data?.data || res.data;
    const userObj = body?.user;
    const token = body?.Accesstoken;
    if (token) {
      localStorage.setItem("kanban_token", token);
    }
    if (userObj) {
      const normalized = {
        id: userObj.id || userObj._id,
        _id: userObj._id || userObj.id,
        name: userObj.name || userData.name,
        email: userObj.email || userData.email,
        avatar: userObj.avatar || userData.avatar || "",
        role: userObj.role || ""
      };
      setUser(normalized);
      localStorage.setItem("kanban_user", JSON.stringify(normalized));
      ensureSocketConnected();
    }
    return res;
  };

  const verifyEmailOtp = async ({ email, otp }) => {
    const res = await verifyOtp({ email, otp });
    const body = res.data?.data || res.data;
    const userObj = body?.user;
    const token = body?.Accesstoken;
    if (token) {
      localStorage.setItem("kanban_token", token);
    }
    if (userObj) {
      const normalized = {
        id: userObj.id || userObj._id,
        _id: userObj._id || userObj.id,
        name: userObj.name || "",
        email: userObj.email || email,
        avatar: userObj.avatar || "",
        role: userObj.role || ""
      };
      setUser(normalized);
      localStorage.setItem("kanban_user", JSON.stringify(normalized));
      ensureSocketConnected();
    }
    return res;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      socket.disconnect();
      setUser(null);
      localStorage.removeItem("kanban_user");
      localStorage.removeItem("kanban_token");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyEmailOtp, logout, refreshUser: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
