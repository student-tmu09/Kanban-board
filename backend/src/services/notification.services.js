const Notification = require("../models/notification.model");
const { getIO } = require("../config/socket.config");

/**
 * Creates a notification in MongoDB and immediately emits it via Socket.IO
 * to the target user's personal room.
 */
const createAndSendNotification = async ({
  userId,
  type,
  message,
  taskId = null,
  boardId = null,
  workspaceId = null
}) => {
  try {
    if (!userId) return null;
    const userIdStr = userId.toString ? userId.toString() : String(userId);

    const notification = await Notification.create({
      user: userId,
      type: type || "notification",
      message: message || "New update",
      task: taskId || null,
      board: boardId || null,
      workspace: workspaceId || null,
      isRead: false
    });

    console.log(`[Notification Service] Created notification ${notification._id} for user ${userIdStr}`);

    try {
      const io = getIO();
      if (io) {
        // Emit to both user:${userIdStr} and user:${userId}
        io.to(`user:${userIdStr}`).emit("notification", {
          _id: notification._id,
          type: notification.type,
          message: notification.message,
          task: notification.task,
          board: notification.board,
          workspace: notification.workspace,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        });
        console.log(`[Notification Service] Emitted real-time notification to user:${userIdStr}`);
      }
    } catch (socketErr) {
      console.warn("[Notification Service] Socket emit skipped:", socketErr.message);
    }

    return notification;
  } catch (err) {
    console.error("[Notification Service] Error creating notification:", err.message);
    return null;
  }
};

module.exports = { createAndSendNotification };
