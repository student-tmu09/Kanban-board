require("dotenv").config();

const http = require("http");
const app = require("./app");
const connectDB = require("./src/config/db.config");

const { initSocket } = require("./src/config/socket.config");
require("./src/workers/email.worker");
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
    });
  } catch (error) {
    console.error("Server startup error:", error);
  }
};

startServer();