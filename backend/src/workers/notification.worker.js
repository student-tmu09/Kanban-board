const { Worker } = require("bullmq");
const redis = require("../config/redis.config");
const Notification = require("../models/notification.model");
const { getIO } = require("../config/socket.config");

let notificationWorker = null;

const initWorker = () => {
  if (notificationWorker) return;
  try {
    notificationWorker = new Worker(
      "notification",
      async (job) => {
        console.log("🔥 WORKER RECEIVED JOB:", job.name);

        // Skip legacy duplicate jobs if queued (handled directly by createAndSendNotification)
        if (
          job.name === "createtask-notification" ||
          job.name === "create-workspace-notification" ||
          job.name === "task-status-notification"
        ) {
          console.log(`[Notification Worker] Skipping duplicate queue job: ${job.name}`);
          return;
        }

        // =================================================
        // DUE DATE NOTIFICATION
        // =================================================
        if (job.name === "due-date-notification") {
          const {
            userId,
            taskId,
            boardId,
            workspaceId,
            title,
          } = job.data;

          // STRICT CHECK: If task was completed (DONE) or deleted, skip due notification
          const Task = require("../models/task.model");
          const currentTask = await Task.findById(taskId);
          if (!currentTask || currentTask.status === "DONE") {
            console.log(`[Worker] Task ${taskId} is already DONE or deleted, skipping due notification.`);
            return;
          }

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

          console.log("✅ Due date notification sent:", notification._id);
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
      console.log(`❌ Job ${job?.id} failed:`, error.message);
    });

    notificationWorker.on("error", (error) => {
      console.warn("[Notification Worker] Redis error:", error.message);
    });
  } catch (err) {
    console.warn("[Notification Worker] BullMQ worker startup skipped:", err.message);
  }
};

if (redis && redis.status === "ready") {
  initWorker();
} else if (redis) {
  redis.once("ready", () => {
    initWorker();
  });
}

module.exports = { initWorker };
