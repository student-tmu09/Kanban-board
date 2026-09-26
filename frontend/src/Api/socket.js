import { io } from "socket.io-client";

export const socket = io(
  import.meta.env.VITE_SOCKET_URL || "http://localhost:3000",
  {
    withCredentials: true,
    transports: ["polling"],
    autoConnect: true,
  }
);

socket.on("connect", () => {
  console.log("🟢 SOCKET CONNECTED:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("🔴 SOCKET ERROR:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("🟡 SOCKET DISCONNECTED:", reason);
});

socket.on("notification", (data) => {
  console.log("🔔 NOTIFICATION RECEIVED:", data);
});