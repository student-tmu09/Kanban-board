import { io } from "socket.io-client";

const getSavedToken = () => {
  try {
    return typeof window !== "undefined" ? localStorage.getItem("kanban_token") : null;
  } catch {
    return null;
  }
};

export const socket = io(
  import.meta.env.VITE_SOCKET_URL || "http://localhost:3000",
  {
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: Boolean(getSavedToken()),
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    auth: (cb) => {
      const token = getSavedToken() || "";
      cb({ token });
    }
  }
);

export const ensureSocketConnected = () => {
  const token = getSavedToken();
  if (!token) {
    if (socket.connected) {
      socket.disconnect();
    }
    return;
  }
  socket.auth = { token };
  if (!socket.connected) {
    socket.connect();
  }
};

socket.on("connect", () => {
  console.log("🟢 SOCKET CONNECTED:", socket.id);
});

socket.on("connect_error", (error) => {
  if (
    error.message?.includes("Authentication") ||
    error.message?.includes("token") ||
    error.message?.includes("jwt")
  ) {
    console.warn("🔒 Socket auth waiting for valid login:", error.message);
    socket.disconnect();
    return;
  }
  console.warn("🔴 SOCKET ERROR:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("🟡 SOCKET DISCONNECTED:", reason);
});
