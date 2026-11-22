const Board = require("../models/board.model");
const Task = require("../models/task.model");
const WorkspaceMember = require('../models/workspacemember.model');
const Workspace = require('../models/workspace.model');
const { User } = require('../models/user.model');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { getIO } = require("../config/socket.config");
const jwt = require("jsonwebtoken");
const { createAndSendNotification } = require("../services/notification.services");
const { sendTaskAssignmentEmail, sendTaskCompletedEmail } = require("../services/email.services");
const { scanAndSend24hDueReminders } = require("../services/taskReminder.services");

// Column Progression Order (Forward-only; reverse movement forbidden)
const COLUMN_ORDER = {
  TODO: 0,
  IN_PROGRESS: 1,
  IN_REVIEW: 2,
  DONE: 3
};

// Utility Helper: Authorization Check

const verifyWorkspaceMember = async (boardId, userId) => {
  const board = await Board.findById(boardId);
  if (!board) throw new ApiError(404, "Board not found");

  const member = await WorkspaceMember.findOne({
    workspaceId: board.workspace,
    userId
  });

  if (!member) throw new ApiError(403, "Access denied: Not a workspace member");

  return { board, member };
};

// -------------------------------------------------------------
// 1. CREATE TASK
// -------------------------------------------------------------
exports.createTask = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, description, assigneeId, dueDate, status } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required"
      });
    }

    // STRICT CHECK: Task due date must be at least 24 hours in the future
    if (dueDate) {
      const dueTime = new Date(dueDate).getTime();
      if (isNaN(dueTime)) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date format"
        });
      }
      const minDueTime = Date.now() + 24 * 60 * 60 * 1000 - 60 * 1000; // at least 24h from now (1 min tolerance)
      if (dueTime < minDueTime) {
        return res.status(400).json({
          success: false,
          message: "Due date kam se kam task create hone ke 24 ghante (1 din) baad ki honi chahiye"
        });
      }
    }

    const { member, board } = await verifyWorkspaceMember(boardId, userId);

    // STRICT CHECK: Self-assignment is forbidden (koi member khud ko task assign nahi kar sakta)
    if (assigneeId && String(assigneeId) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "Koi member khud ko task assign nahi kar sakta. Kripya kisi anya member ko assign karein."
      });
    }

    // A task cannot be created directly in DONE (must be completed via proof)
    const taskStatus = status && status !== "DONE" ? status : "TODO";
    const existingCount = await Task.countDocuments({ boardId, status: taskStatus });

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : null,
      boardId,
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      dueReminder24hSent: false,
      status: taskStatus,
      order: existingCount + 1,
      createrId: userId
    });

    // Check if 24h reminder is already due (e.g. set to exactly 24 hours)
    if (task.dueDate && task.assigneeId) {
      scanAndSend24hDueReminders();
    }

    const populatedTask = await Task.findById(task._id).populate("assigneeId", "name email avatar");

    try {
      const io = getIO();
      if (io) {
        io.to(`board:${task.boardId}`).emit("task_created", {
          taskId: task._id,
          task: populatedTask
        });
      }
    } catch (ioErr) {
      console.warn("Socket io error:", ioErr.message);
    }

    // Fire notifications asynchronously without blocking response
    if (task.assigneeId) {
      createAndSendNotification({
        userId: task.assigneeId,
        type: "task_assigned",
        message: `You have been assigned the task "${title}"`,
        taskId: task._id,
        boardId: task.boardId,
        workspaceId: board ? board.workspace : null,
      }).catch((e) => console.warn(e.message));

      // Asynchronously send Gmail email notification
      (async () => {
        try {
          const assigneeUser = await User.findById(task.assigneeId).select("name email");
          const assignorUser = await User.findById(userId).select("name email");
          const workspace = board?.workspace ? await Workspace.findById(board.workspace).select("name") : null;

          if (assigneeUser && assigneeUser.email) {
            await sendTaskAssignmentEmail({
              assigneeEmail: assigneeUser.email,
              assigneeName: assigneeUser.name,
              assignorName: assignorUser?.name || "A team member",
              taskTitle: task.title,
              taskDescription: task.description,
              dueDate: task.dueDate,
              boardName: board?.name,
              boardId: task.boardId,
              workspaceName: workspace?.name,
            });
          }
        } catch (mailErr) {
          console.warn("[Task Email] Error sending email:", mailErr.message);
        }
      })();
    }

    if (
      task.createrId &&
      (!task.assigneeId || task.createrId.toString() !== task.assigneeId.toString())
    ) {
      createAndSendNotification({
        userId: task.createrId,
        type: "task_created",
        message: `You created the task "${title}"`,
        taskId: task._id,
        boardId: task.boardId,
        workspaceId: board ? board.workspace : null,
      }).catch((e) => console.warn(e.message));
    }

    return res
      .status(201)
      .json(new ApiResponse(201, populatedTask, "Task created successfully"));
  } catch (error) {
    console.error("Create task error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create task"
    });
  }
};

// -------------------------------------------------------------
// 2. GET ALL TASKS OF A BOARD
// -------------------------------------------------------------
exports.getBoardTasks = async (req, res) => {
  const { boardId } = req.params;
  const userId = req.user.id;

  await verifyWorkspaceMember(boardId, userId);

  const tasks = await Task.find({ boardId })
    .populate("assigneeId", "name email avatar")
    .populate("createrId", "name email avatar")
    .populate("completionProof.submittedBy", "name email avatar")
    .sort({ order: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Board tasks fetched successfully"));
};

// -------------------------------------------------------------
// 3. GET SINGLE TASK DETAILS
// -------------------------------------------------------------
exports.getTaskById = async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user.id;

  if (!taskId) {
    throw new ApiError(400, "taskId is required");
  }

  const task = await Task.findById(taskId)
    .populate("assigneeId", "name email avatar")
    .populate("createrId", "name email avatar")
    .populate("completionProof.submittedBy", "name email avatar");
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  await verifyWorkspaceMember(task.boardId, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task details fetched successfully"));
};

// -------------------------------------------------------------
// 4. UPDATE TASK DETAILS
// -------------------------------------------------------------
exports.updateTask = async (req, res) => {
  const { taskId } = req.params;
  const { title, description, assigneeId, dueDate, status, completionProof } = req.body;
  const userId = req.user.id;

  if (!taskId) {
    throw new ApiError(400, "taskId is required");
  }

  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const { member, board } = await verifyWorkspaceMember(task.boardId, userId);

  const oldAssigneeId = task.assigneeId ? task.assigneeId.toString() : null;
  const newAssigneeId = assigneeId !== undefined ? (assigneeId ? assigneeId.toString() : null) : oldAssigneeId;
  const oldStatus = task.status;

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;

  // STRICT ASSIGNEE CHANGE PERMISSIONS:
  // 1. Only the task creator (createrId) can change the assignee
  // 2. Assignee can ONLY be changed when task is in TODO or IN_PROGRESS (NOT in IN_REVIEW or DONE)
  if (assigneeId !== undefined && newAssigneeId !== oldAssigneeId) {
    const creatorIdStr = task.createrId?._id
      ? task.createrId._id.toString()
      : task.createrId
      ? task.createrId.toString()
      : null;

    if (!creatorIdStr || creatorIdStr !== userId.toString()) {
      throw new ApiError(403, "Assignee sirf task create karne wala user hi change kar sakta hai");
    }

    if (task.status === "IN_REVIEW" || task.status === "DONE") {
      throw new ApiError(
        400,
        `Task jab ${task.status.replace(/_/g, " ")} me ho tab uska assignee change nahi kiya ja sakta. Sirf TODO ya IN PROGRESS me hi allow hai.`
      );
    }

    // STRICT CHECK: Self-assignment is forbidden (koi member khud ko task assign nahi kar sakta)
    if (newAssigneeId && String(newAssigneeId) === String(userId)) {
      throw new ApiError(
        400,
        "Koi member khud ko task assign nahi kar sakta. Kripya kisi anya member ko assign karein."
      );
    }

    task.assigneeId = assigneeId || null;
  }

  if (dueDate !== undefined) {
    if (dueDate) {
      const dueTime = new Date(dueDate).getTime();
      if (isNaN(dueTime)) {
        throw new ApiError(400, "Invalid due date format");
      }
      const taskCreatedTime = task.createdAt ? new Date(task.createdAt).getTime() : Date.now();
      const minDueTime = taskCreatedTime + 24 * 60 * 60 * 1000 - 60 * 1000;
      if (dueTime < minDueTime) {
        throw new ApiError(400, "Due date task create hone ke kam se kam 24 ghante baad ki honi chahiye");
      }
      task.dueDate = new Date(dueDate);
      if (dueTime > Date.now() + 24 * 60 * 60 * 1000) {
        task.dueReminder24hSent = false;
      }
    } else {
      task.dueDate = null;
    }
  }

  if (status !== undefined && status !== task.status) {
    const assigneeIdStr = task.assigneeId?._id
      ? task.assigneeId._id.toString()
      : task.assigneeId
      ? task.assigneeId.toString()
      : null;

    if (!assigneeIdStr || assigneeIdStr !== userId.toString()) {
      throw new ApiError(403, "Only the assigned user can change the status of this task");
    }

    if (COLUMN_ORDER[status] === undefined) {
      throw new ApiError(400, "Invalid status");
    }

    // STRICT CHECK: Forward-only column movement! Reverse/backward movement is forbidden.
    if (COLUMN_ORDER[status] < COLUMN_ORDER[task.status]) {
      throw new ApiError(
        400,
        `Task ko peeche wale column (${status}) me reverse move nahi kiya ja sakta. Only forward movement is allowed.`
      );
    }

    task.status = status;

    // If task is completed (DONE), mark reminder as sent/cancelled so no 24h reminder email can ever be dispatched
    if (status === "DONE") {
      task.dueReminder24hSent = true;
    }
  }

  if (status === "DONE" && completionProof) {
    task.completionProof = {
      note: completionProof.note ? completionProof.note.trim() : "",
      fileUrl: completionProof.fileUrl || "",
      fileName: completionProof.fileName || "",
      fileType: completionProof.fileType || "",
      linkUrl: completionProof.linkUrl ? completionProof.linkUrl.trim() : "",
      submittedAt: new Date(),
      submittedBy: userId
    };
  }

  await task.save();

  // If task has dueDate and assignee, trigger reminder scan
  if (task.dueDate && task.assigneeId && task.status !== "DONE") {
    scanAndSend24hDueReminders();
  }

  const populatedTask = await Task.findById(task._id)
    .populate("assigneeId", "name email avatar")
    .populate("createrId", "name email avatar")
    .populate("completionProof.submittedBy", "name email avatar");

  const io = getIO();
  if (io) {
    io.to(`board:${task.boardId}`).emit("task_updated", {
      task: populatedTask
    });
  }

  // If task status was updated to DONE (Completed), send email to task creator
  if (task.status === "DONE" && oldStatus !== "DONE" && task.createrId) {
    (async () => {
      try {
        const creatorUser = await User.findById(task.createrId).select("name email");
        const completedByUser = await User.findById(userId).select("name email");
        const workspace = board?.workspace ? await Workspace.findById(board.workspace).select("name") : null;

        if (creatorUser && creatorUser.email) {
          await sendTaskCompletedEmail({
            creatorEmail: creatorUser.email,
            creatorName: creatorUser.name,
            completedByName: completedByUser?.name || "A team member",
            taskTitle: task.title,
            taskDescription: task.description,
            boardName: board?.name,
            boardId: task.boardId,
            workspaceName: workspace?.name,
            completionProof: task.completionProof
          });
        }
      } catch (mailErr) {
        console.warn("[Task Completed Email] Error sending email to creator:", mailErr.message);
      }
    })();
  }

  // If newly assigned or reassigned to a different member, dispatch notifications & Gmail email
  if (newAssigneeId && newAssigneeId !== oldAssigneeId) {
    createAndSendNotification({
      userId: newAssigneeId,
      type: "task_assigned",
      message: `You have been assigned the task "${task.title}"`,
      taskId: task._id,
      boardId: task.boardId,
      workspaceId: board ? board.workspace : null,
    }).catch((e) => console.warn(e.message));

    (async () => {
      try {
        const assigneeUser = await User.findById(newAssigneeId).select("name email");
        const assignorUser = await User.findById(userId).select("name email");
        const workspace = board?.workspace ? await Workspace.findById(board.workspace).select("name") : null;

        if (assigneeUser && assigneeUser.email) {
          await sendTaskAssignmentEmail({
            assigneeEmail: assigneeUser.email,
            assigneeName: assigneeUser.name,
            assignorName: assignorUser?.name || "A team member",
            taskTitle: task.title,
            taskDescription: task.description,
            dueDate: task.dueDate,
            boardName: board?.name,
            boardId: task.boardId,
            workspaceName: workspace?.name,
          });
        }
      } catch (mailErr) {
        console.warn("[Task Email] Error sending email:", mailErr.message);
      }
    })();
  }
  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task updated successfully"));
};

// -------------------------------------------------------------
// 5. MOVE TASK (Status Change & Drag-and-Drop)
// -------------------------------------------------------------
exports.moveTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, order, completionProof } = req.body;
    const userId = req.user.id;

    if (!taskId) {
      return res.status(400).json({ success: false, message: "taskId is required" });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const { member, board } = await verifyWorkspaceMember(task.boardId, userId);

    // ONLY the assigned user can move this task
    const assigneeIdStr = task.assigneeId?._id
      ? task.assigneeId._id.toString()
      : task.assigneeId
      ? task.assigneeId.toString()
      : null;

    const currentUserIdStr = userId.toString();

    if (!assigneeIdStr || assigneeIdStr !== currentUserIdStr) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned user can move this task"
      });
    }

    if (COLUMN_ORDER[status] === undefined) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    // STRICT CHECK: Forward-only column movement! Reverse/backward movement is forbidden.
    if (COLUMN_ORDER[status] < COLUMN_ORDER[task.status]) {
      return res.status(400).json({
        success: false,
        message: `Task ko peeche wale column (${status}) me reverse move nahi kiya ja sakta. Only forward movement is allowed.`
      });
    }

    const orderNum = typeof order === "number" && order >= 0 ? order : (task.order || 1);
    const oldStatus = task.status;
    const oldOrder = task.order || 1;

    // Moving within same column
    if (oldStatus === status) {
      if (orderNum < oldOrder) {
        await Task.updateMany(
          {
            boardId: task.boardId,
            status: status,
            order: {
              $gte: orderNum,
              $lt: oldOrder
            },
            _id: {
              $ne: taskId
            }
          },
          {
            $inc: {
              order: 1
            }
          }
        );
      } else if (orderNum > oldOrder) {
        await Task.updateMany(
          {
            boardId: task.boardId,
            status: status,
            order: {
              $gt: oldOrder,
              $lte: orderNum
            },
            _id: {
              $ne: taskId
            }
          },
          {
            $inc: {
              order: -1
            }
          }
        );
      }

      task.order = orderNum;
      await task.save();
    }
    // Cross-column movement (FORWARD OR BACKWARD freely!)
    else {
      // OLD COLUMN: Shift remaining tasks up
      await Task.updateMany(
        {
          boardId: task.boardId,
          status: oldStatus,
          order: {
            $gt: oldOrder
          },
          _id: {
            $ne: taskId
          }
        },
        {
          $inc: {
            order: -1
          }
        }
      );

      // NEW COLUMN: Shift existing tasks down to make space
      await Task.updateMany(
        {
          boardId: task.boardId,
          status: status,
          order: {
            $gte: orderNum
          }
        },
        {
          $inc: {
            order: 1
          }
        }
      );

      task.status = status;
      task.order = orderNum;

      // If task is completed (DONE), mark reminder as sent/cancelled so no 24h reminder email can ever be dispatched
      if (status === "DONE") {
        task.dueReminder24hSent = true;
      }

      if (status === "DONE" && completionProof) {
        task.completionProof = {
          note: completionProof.note ? completionProof.note.trim() : "",
          fileUrl: completionProof.fileUrl || "",
          fileName: completionProof.fileName || "",
          fileType: completionProof.fileType || "",
          linkUrl: completionProof.linkUrl ? completionProof.linkUrl.trim() : "",
          submittedAt: new Date(),
          submittedBy: userId
        };
      }

      await task.save();
    }

    const populatedTask = await Task.findById(task._id)
      .populate("assigneeId", "name email avatar")
      .populate("createrId", "name email avatar")
      .populate("completionProof.submittedBy", "name email avatar");

    // Emit socket event to all board members
    try {
      const io = getIO();
      if (io) {
        io.to(`board:${task.boardId}`).emit("task_moved", {
          taskId: task._id,
          boardId: task.boardId,
          status: task.status,
          order: task.order,
          task: populatedTask
        });
      }
    } catch (ioErr) {
      console.warn("Socket io error:", ioErr.message);
    }

    // Fire notifications asynchronously (never block response!)
    if (task.assigneeId) {
      createAndSendNotification({
        userId: task.assigneeId,
        type: "task_moved",
        message: `Task "${task.title}" moved to ${task.status.replace(/_/g, " ")}`,
        taskId: task._id,
        boardId: task.boardId,
        workspaceId: board ? board.workspace : null,
      }).catch((e) => console.warn(e.message));
    }

    if (
      task.createrId &&
      (!task.assigneeId || task.createrId.toString() !== task.assigneeId.toString())
    ) {
      const isDone = task.status === "DONE";
      createAndSendNotification({
        userId: task.createrId,
        type: isDone ? "task_completed" : "task_moved",
        message: isDone
          ? `🎉 Task "${task.title}" you created has been completed!`
          : `Task "${task.title}" status changed to ${task.status.replace(/_/g, " ")}`,
        taskId: task._id,
        boardId: task.boardId,
        workspaceId: board ? board.workspace : null,
      }).catch((e) => console.warn(e.message));
    }

    // If task was moved to DONE (Completed column), send completion email to task creator
    if (status === "DONE" && oldStatus !== "DONE" && task.createrId) {
      (async () => {
        try {
          const creatorUser = await User.findById(task.createrId).select("name email");
          const completedByUser = await User.findById(userId).select("name email");
          const workspace = board?.workspace ? await Workspace.findById(board.workspace).select("name") : null;

          if (creatorUser && creatorUser.email) {
            await sendTaskCompletedEmail({
              creatorEmail: creatorUser.email,
              creatorName: creatorUser.name,
              completedByName: completedByUser?.name || "A team member",
              taskTitle: task.title,
              taskDescription: task.description,
              boardName: board?.name,
              boardId: task.boardId,
              workspaceName: workspace?.name,
              completionProof: task.completionProof
            });
          }
        } catch (mailErr) {
          console.warn("[Task Completed Email] Error sending email to creator:", mailErr.message);
        }
      })();
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        populatedTask,
        "Task moved successfully"
      )
    );
  } catch (error) {
    console.error("Move task error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to move task"
    });
  }
};


// -------------------------------------------------------------
// 6. DELETE TASK
// -------------------------------------------------------------
exports.deleteTask = async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user.id;

  if (!taskId) {
    throw new ApiError(400, "taskId is required");
  }

  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const { member } = await verifyWorkspaceMember(task.boardId, userId);

  await task.deleteOne();
const io=getIO()
io.
 to(`board:${task.boardId}`).emit('task_deleted',{
  taskId
 })
 if(task.assigneeId){
 io.
 to(`user:${task.assigneeId}`).emit('task_deleted',{
  taskId
 })
 }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Task deleted successfully"));
}
