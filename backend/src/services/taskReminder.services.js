const Task = require("../models/task.model");
const { sendTaskDueReminderEmail } = require("./email.services");
const { createAndSendNotification } = require("./notification.services");

let schedulerInterval = null;

/**
 * Checks all active tasks whose due date is within the next 24 hours (or overdue)
 * and sends an automated 24-hour reminder email to the assignee.
 */
const scanAndSend24hDueReminders = async () => {
  try {
    // Exactly 24 hours ahead (plus 2 minute window for interval tolerance)
    const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 1000);

    const pendingTasks = await Task.find({
      status: { $ne: "DONE" },
      dueDate: { $ne: null, $lte: threshold },
      dueReminder24hSent: false,
      assigneeId: { $ne: null }
    })
      .populate("assigneeId", "name email")
      .populate({
        path: "boardId",
        select: "name workspace",
        populate: { path: "workspace", select: "name" }
      });

    if (pendingTasks.length > 0) {
      console.log(`⏰ [Task Reminder] Found ${pendingTasks.length} task(s) needing 24-hour due reminder email.`);
    }

    for (const task of pendingTasks) {
      try {
        // STRICT CHECK: If task was completed (DONE), do NOT send reminder email!
        if (task.status === "DONE") {
          task.dueReminder24hSent = true;
          await task.save();
          continue;
        }

        // Prevent duplicate dispatch by immediately setting dueReminder24hSent
        task.dueReminder24hSent = true;
        await task.save();

        const assignee = task.assigneeId;
        if (!assignee || !assignee.email) continue;

        const board = task.boardId;
        const workspace = board?.workspace;

        // 1. Dispatch email
        await sendTaskDueReminderEmail({
          assigneeEmail: assignee.email,
          assigneeName: assignee.name,
          taskTitle: task.title,
          taskDescription: task.description,
          dueDate: task.dueDate,
          boardName: board?.name,
          boardId: board?._id || task.boardId,
          workspaceName: workspace?.name,
        });

        // 2. Dispatch in-app notification
        createAndSendNotification({
          userId: assignee._id,
          type: "task_updated",
          message: `⏰ 24h Reminder: Task "${task.title}" is due in 24 hours! Please complete it.`,
          taskId: task._id,
          boardId: board?._id || task.boardId,
          workspaceId: workspace?._id,
        }).catch((e) => console.warn("[Task Reminder] In-app notification error:", e.message));

      } catch (taskErr) {
        console.error(`[Task Reminder] Error processing task ${task._id}:`, taskErr.message);
      }
    }
  } catch (err) {
    console.error("[Task Reminder] Scheduler scan failed:", err.message);
  }
};

/**
 * Starts the background interval scanner to check for 24-hour due reminders
 */
const startTaskReminderScheduler = () => {
  if (schedulerInterval) return;

  // Run initial scan
  scanAndSend24hDueReminders();

  // Run every 60 seconds (1 minute)
  schedulerInterval = setInterval(scanAndSend24hDueReminders, 60 * 1000);
  console.log("⏰ [Task Reminder] 24-hour due reminder scheduler started (checking every 60s).");
};

module.exports = {
  scanAndSend24hDueReminders,
  startTaskReminderScheduler,
};
