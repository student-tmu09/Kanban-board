const { Queue } = require("bullmq");
const redis = require("../config/redis.config");

let notificationQueue = null;

try {
  notificationQueue = new Queue("notification", {
    connection: redis,
  });
} catch (err) {
  console.warn("Notification Queue initialization skipped (Redis offline):", err.message);
}

const isRedisAvailable = () => {
  return redis && redis.status === "ready";
};

// =====================================================
// TASK CREATED / ASSIGNED NOTIFICATION
// =====================================================

const addNotificationJob = async ({
  userId,
  type,
  message,
  taskId,
  boardId,
  workspaceId,
}) => {
  if (!userId) {
    return null;
  }

  if (!isRedisAvailable() || !notificationQueue) {
    console.log("⚠️ Redis offline, skipping BullMQ job for task creation");
    return null;
  }

  try {
    const job = await notificationQueue.add(
      "createtask-notification",
      {
        userId,
        type,
        message,
        taskId,
        boardId,
        workspaceId,
      },
      {
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    console.log("✅ Notification Job Added:", job.id);
    return job;
  } catch (err) {
    console.warn("Failed to add notification job to queue:", err.message);
    return null;
  }
};

// =====================================================
// DUE DATE NOTIFICATION
// =====================================================

const addDueDateNotificationJob = async ({
  userId,
  taskId,
  boardId,
  workspaceId,
  dueDate,
  taskTitle,
}) => {
  const delay = new Date(dueDate).getTime() - Date.now();

  if (delay <= 0) {
    return null;
  }

  if (!isRedisAvailable() || !notificationQueue) {
    return null;
  }

  try {
    const job = await notificationQueue.add(
      "due-date-notification",
      {
        userId,
        taskId,
        boardId,
        workspaceId,
        title: taskTitle,
      },
      {
        delay,
        attempts: 2,
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    return job;
  } catch (err) {
    console.warn("Failed to add due date job:", err.message);
    return null;
  }
};

// =====================================================
// WORKSPACE CREATED
// =====================================================

const workspaceCreateNotification = async ({
  workspaceId,
  userId,
}) => {
  if (!isRedisAvailable() || !notificationQueue) {
    return null;
  }

  try {
    const job = await notificationQueue.add(
      "create-workspace-notification",
      {
        userId,
        workspaceId,
      },
      {
        attempts: 2,
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    return job;
  } catch (err) {
    console.warn("Failed to add workspace creation job:", err.message);
    return null;
  }
};

// =====================================================
// TASK STATUS CHANGE
// =====================================================

const addTaskStatusNotificationJob = async ({
  userId,
  taskId,
  boardId,
  workspaceId,
  message,
}) => {
  if (!userId) {
    return null;
  }

  if (!isRedisAvailable() || !notificationQueue) {
    return null;
  }

  try {
    const job = await notificationQueue.add(
      "task-status-notification",
      {
        userId,
        taskId,
        boardId,
        workspaceId,
        message,
        type: "task_moved",
      },
      {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    return job;
  } catch (err) {
    console.warn("Failed to add task status job:", err.message);
    return null;
  }
};

module.exports = {
  addNotificationJob,
  addDueDateNotificationJob,
  workspaceCreateNotification,
  addTaskStatusNotificationJob,
};
