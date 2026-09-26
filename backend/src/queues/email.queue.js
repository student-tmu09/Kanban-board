const { Queue } = require("bullmq");
const redis = require("../config/redis.config");

const notificationQueue = new Queue("notification", {
  connection: redis,
});


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

  console.log("📢 Adding notification job...");

  console.log({
    userId,
    type,
    message,
    taskId,
    boardId,
    workspaceId,
  });
     if (!userId) {
    console.log("⚠️ Notification skipped: userId is missing");
    return;
  }
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
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );

  console.log("✅ Notification Job Added:", job.id);

  return job;
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
    console.log("Due date already passed");
    return;
  }

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
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );

  console.log("Due Date Job ID:", job.id);

  return job;
};


// =====================================================
// WORKSPACE CREATED
// =====================================================

const workspaceCreateNotification = async ({
  workspaceId,
  userId,
}) => {

  const job = await notificationQueue.add(
    "create-workspace-notification",
    {
      userId,
      workspaceId,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );

  console.log("Workspace Created Job:", job.id);

  return job;
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
    console.log("⚠️ No userId, notification skipped");
    return;
  }

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
      attempts: 1
      ,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );

  console.log("Task status notification job:", job.id);

  return job;
};


module.exports = {
  addNotificationJob,
  addDueDateNotificationJob,
  workspaceCreateNotification,
  addTaskStatusNotificationJob,
};