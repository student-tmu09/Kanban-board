import { io } from "socket.io-client";

export const socket = io(
  import.meta.env.VITE_SOCKET_URL || "http://localhost:3000",
  {
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    auth: (cb) => {
      cb({ token: localStorage.getItem("kanban_token") || "" });
    }
  }
);

export const ensureSocketConnected = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

socket.on("connect", () => {
  console.log("🟢 SOCKET CONNECTED:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("🔴 SOCKET ERROR:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("🟡 SOCKET DISCONNECTED:", reason);
});
