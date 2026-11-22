const { Server } = require("socket.io");
const { socketAuthMiddleware } = require("../middlewares/socket.middleware");
const redis = require("../config/redis.config");

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Socket authentication
  io.use(socketAuthMiddleware);

  io.on("connection", async (socket) => {
    const userIdStr = socket.user._id ? socket.user._id.toString() : socket.user.id;

    console.log(
      `Socket Connected: User ID [${userIdStr}] Socket ID: ${socket.id}`
    );

    // =========================
    // USER ROOMS
    // =========================
    socket.join(`user:${userIdStr}`);
    if (socket.user.id && socket.user.id !== userIdStr) {
      socket.join(`user:${socket.user.id}`);
    }

    try {
      const key = `user:${userIdStr}:sockets`;
      const count = await redis.incr(key);
      if (count === 1) {
        io.emit("user_online", {
          userId: userIdStr,
        });
      }
    } catch (redisErr) {
      // Redis offline is okay
    }

    // =========================
    // JOIN BOARD
    // =========================

    socket.on("join_board", ({ boardId }) => {

      if (!boardId) return;

      socket.join(`board:${boardId}`);

      console.log(
        `User ${socket.user.id} joined board room: board:${boardId}`
      );

    });

    // =========================
    // LEAVE BOARD
    // =========================

    socket.on("leave_board", ({ boardId }) => {

      if (!boardId) return;

      socket.leave(`board:${boardId}`);

      console.log(
        `User ${socket.user.id} left board room: board:${boardId}`
      );

    });

    // =========================
    // JOIN WORKSPACE
    // =========================

    socket.on("join-workspace", (workspaceId) => {

      if (!workspaceId) return;

      socket.join(`workspace:${workspaceId}`);

      console.log(
        `User ${socket.user.id} joined workspace:${workspaceId}`
      );

    });

    // =========================
    // LEAVE WORKSPACE
    // =========================

    socket.on("leave-workspace", (workspaceId) => {

      if (!workspaceId) return;

      socket.leave(`workspace:${workspaceId}`);

      console.log(
        `User ${socket.user.id} left workspace:${workspaceId}`
      );

    });

    // =========================
    // DISCONNECT
    // =========================

    socket.on("disconnect", async () => {

      console.log(
        `Socket disconnected: ${socket.id}`
      );

      const key = `user:${socket.user.id}:sockets`;

      const count = await redis.decr(key);

      if (count <= 0) {

        await redis.del(key);

        io.emit("user_offline", {
          userId: socket.user.id,
        });

      }

    });

  });
};


const getIO = () => {

  if (!io) {
    throw new Error(
      "Socket.io has not been initialized!"
    );
  }

  return io;
};


module.exports = {
  initSocket,
  getIO,
};