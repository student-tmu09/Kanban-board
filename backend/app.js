
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();

// ===============================
// CORS
// ===============================
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// ===============================
// BODY PARSER
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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


module.exports = app;
