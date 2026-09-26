require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env")
});
console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
const { Worker } = require("bullmq");
const redis = require("../config/redis.config");
const Notification = require("../models/notification.model");
const { getIO } = require("../config/socket.config");
const connectdb=require("../config/db.config")

connectdb()
const notificationWorker = new Worker(
  "notification",

  async (job) => {

    console.log("🔥 WORKER RECEIVED JOB");
    console.log("Job name:", job.name);
    console.log("Job data:", job.data);


    // =================================================
    // TASK CREATED / ASSIGNED
    // =================================================

    if (job.name === "createtask-notification") {

      const {
        userId,
        type,
        message,
        taskId,
        boardId,
        workspaceId,
      } = job.data;


      const notification = await Notification.create({
        user: userId,
        type,
        message,
        task: taskId,
        board: boardId,
        workspace: workspaceId,
        isRead: false,
      });


      console.log(
        "✅ NOTIFICATION CREATED:",
        notification._id
      );


      getIO()
        .to(`user:${userId}`)
        .emit("notification", {
          _id: notification._id,
          type: notification.type,
          message: notification.message,
          task: notification.task,
          board: notification.board,
          workspace: notification.workspace,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        });


      console.log("📢 NOTIFICATION EMITTED");
    }


    // =================================================
    // DUE DATE
    // =================================================

    if (job.name === "due-date-notification") {

      const {
        userId,
        taskId,
        boardId,
        workspaceId,
        title,
      } = job.data;


      const notification = await Notification.create({
        user: userId,
        type: "task_updated",
        message: `Task "${title}" is due now`,
        task: taskId,
        board: boardId,
        workspace: workspaceId,
        isRead: false,
      });


      getIO()
        .to(`user:${userId}`)
        .emit("notification", {
          _id: notification._id,
          type: notification.type,
          message: notification.message,
          task: notification.task,
          board: notification.board,
          workspace: notification.workspace,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        });


      console.log(
        "✅ Due date notification sent:",
        notification._id
      );
    }


    // =================================================
    // WORKSPACE CREATED
    // =================================================

    if (job.name === "create-workspace-notification") {

      const {
        userId,
        workspaceId,
      } = job.data;


      const notification = await Notification.create({
        user: userId,
        workspace: workspaceId,
        type: "workspace_created",
        message: "You have created a workspace",
        isRead: false,
      });


      getIO()
        .to(`user:${userId}`)
        .emit("notification", {
          _id: notification._id,
          type: notification.type,
          message: notification.message,
          workspace: notification.workspace,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        });


      console.log(
        "✅ Workspace notification created:",
        notification._id
      );
    }


    // =================================================
    // TASK MOVED
    // =================================================

    if (job.name === "task-status-notification") {

      const {
        userId,
        taskId,
        boardId,
        workspaceId,
        message,
        type,
      } = job.data;


      const notification = await Notification.create({
        user: userId,
        type,
        message,
        task: taskId,
        board: boardId,
        workspace: workspaceId,
        isRead: false,
      });


      getIO()
        .to(`user:${userId}`)
        .emit("notification", {
          _id: notification._id,
          type: notification.type,
          message: notification.message,
          task: notification.task,
          board: notification.board,
          workspace: notification.workspace,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        });


      console.log(
        "✅ Task status notification sent to:",
        userId
      );
    }
  },

  {
    connection: redis,
  }
);


notificationWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});


notificationWorker.on("failed", (job, error) => {
  console.log(
    `❌ Job ${job?.id} failed:`,
    error.message
  );
});