const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config();

const http = require("http");
const app = require("./app");
const connectDB = require("./src/config/db.config");

const { initSocket } = require("./src/config/socket.config");
const { startTaskReminderScheduler } = require("./src/services/taskReminder.services");
require("./src/workers/notification.worker");
const PORT = 3000;

const server = http.createServer(app);

const startServer = async () => {
  try {
    // MongoDB connect
    await connectDB();

    // Socket.IO initialize
    initSocket(server);

    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      startTaskReminderScheduler();
    });
  } catch (error) {
    console.error("Server startup error:", error);
  }
};

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

startServer();
