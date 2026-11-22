
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();

// ===============================
// CORS
// ===============================
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, postman, server-to-server)
      if (!origin) return callback(null, true);
      // Allow any localhost or 127.0.0.1 port
      if (
        /^http:\/\/localhost(:\d+)?$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// ===============================
// BODY PARSER
// ===============================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(cookieParser());
// ===============================
// ROUTES
// ===============================
const userRoute = require("./src/route/user.route");
const workspaceRoute = require("./src/route/workspace.route");
const workspaceMemberRoute = require("./src/route/workspacemember.route");
const boardRoute = require("./src/route/board.route");
const taskRoute = require("./src/route/task.route");
const commentRoute = require("./src/route/comment.route");
const dashboardRoute = require("./src/route/dashboard.route");
const notificationRoute = require("./src/route/notification.route");

// ===============================
// API ROUTES
// ===============================
app.use("/api", userRoute);
app.use("/api", workspaceRoute);
app.use("/api", workspaceMemberRoute);
app.use("/api", boardRoute);
app.use("/api", taskRoute);
app.use("/api", commentRoute);
app.use("/api", dashboardRoute);
app.use("/api", notificationRoute);

// ===============================
// GLOBAL ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

module.exports = app;
