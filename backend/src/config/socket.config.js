const { Server } = require("socket.io");
const { socketAuthMiddleware } = require("../middlewares/socket.middleware");
const redis = require("../config/redis.config");

const Redis = require("ioredis");

const redisSubscriber = new Redis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  {
    maxRetriesPerRequest: null,
  }
);
let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
    transports: ["polling", "websocket"],
  });

  // Socket authentication
  io.use(socketAuthMiddleware);

  io.on("connection", async (socket) => {

    console.log(
      `Socket Connected: User ID [${socket.user.id}] Socket ID: ${socket.id}`
    );

    // =========================
    // USER ROOM
    // =========================

    socket.join(`user:${socket.user.id}`);

    const key = `user:${socket.user.id}:sockets`;

    const count = await redis.incr(key);

    if (count === 1) {
      io.emit("user_online", {
        userId: socket.user.id,
      });
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