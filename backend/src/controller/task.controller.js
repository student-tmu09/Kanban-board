const Board = require("../models/board.model")
const Task=require("../models/task.model")
const WorkspaceMember = require('../models/workspacemember.model');
const {ApiError}= require('../utils/ApiError');       // Adjust path as per your folder structure
const {ApiResponse} = require('../utils/ApiResponse'); // Adjust path as per your folder structure
const{getIO}=require("../config/socket.config")
const jwt=require("jsonwebtoken")
const {addNotificationJob,addTaskStatusNotificationJob}=require("../queues/email.queue")
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
// -d------------------------------------------------------------
exports.createTask = async (req, res) => {
  const { boardId } = req.params;
  const { title, description, assigneeId, dueDate, } = req.body;
  const userId = req.user.id;

  if (!title) {
    throw new ApiError(400, "Task title is required");
  }

  const { member } = await verifyWorkspaceMember(boardId, userId);

  if (member.role === "VIEWER") {
    throw new ApiError(403, "VIEWER role cannot create tasks");
  }

  const task = await Task.create({
    title,
    description: description || null,
    boardId,
    assigneeId: assigneeId || null,
    dueDate: dueDate || null,
    order:1,
    createrId: userId
  });

  const io=getIO()
  io.to(`board:${task.boardId}`).emit("task_created", {
    taskId: task._id,
    task
  });

const board = await Board.findById(boardId);
if (task.assigneeId) {

  await addNotificationJob({
    userId: task.assigneeId,
    type: "task_assigned",
    message: `You have been assigned the task "${title}"`,
    taskId: task._id,
    boardId: task.boardId,
    workspaceId: board.workspace,
  });

}


// ==========================================
// CREATOR NOTIFICATION
// ==========================================

if (
  task.createrId &&
  (!task.assigneeId ||
    task.createrId.toString() !== task.assigneeId.toString())
) {

  await addNotificationJob({
    userId: task.createrId,
    type: "task_updated",
    message: `You created the task "${title}"`,
    taskId: task._id,
    boardId: task.boardId,
    workspaceId: board.workspace,
  });

}
  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
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

  const task = await Task.findById(taskId).populate("assigneeId", "name email avatar");
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
  const { title, description, assigneeId, dueDate } = req.body;
  const userId = req.user.id;

  if (!taskId) {
    throw new ApiError(400, "taskId is required");
  }

  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const { member } = await verifyWorkspaceMember(task.boardId, userId);

  if (member.role === "VIEWER") {
    throw new ApiError(403, "VIEWER role cannot update tasks");
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (assigneeId !== undefined) task.assigneeId = assigneeId;
  if (dueDate !== undefined) task.dueDate = dueDate;

  await task.save();
  const io=getIO()
  io.to(`board:${task.boardId}`).emit("task_updated",{
    task
  })
  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task updated successfully"));
};

// -------------------------------------------------------------
// 5. MOVE TASK (Status Change & Drag-and-Drop)
// -------------------------------------------------------------
exports.moveTask = async (req, res) => {
  const { taskId } = req.params;
  const { status,order } = req.body;
  const userId = req.user.id;

  if (!taskId) {
    throw new ApiError(400, "taskId is required");
  }

  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const { member,board } = await verifyWorkspaceMember(task.boardId, userId);

  if (member.role === "VIEWER") {
    throw new ApiError(403, "VIEWER role cannot move tasks");
  }


    // 2. Validate status
    const allowedStatus = [
      "TODO",
      "IN_PROGRESS",
      "IN_REVIEW",
      "DONE"
    ];

    if (!allowedStatus.includes(status)) {
      throw new ApiError(400, "Invalid status");
    }

    if (typeof order !== "number" || order < 0) {
      throw new ApiError(400, "Invalid order");
    }
    if (
  !task.assigneeId ||
  userId.toString() !== task.assigneeId.toString()
) {
  throw new ApiError(400, "Only assigned member can move task");
}
    const oldStatus = task.status;
    const oldOrder = task.order;

    // =====================================
    // SAME COLUMN
    // =====================================

    if (oldStatus === status) {

      if (order < oldOrder) {

        // Example:
        // A = 0
        // B = 1
        // C = 2
        //
        // C → 0
        //
        // A = 1
        // B = 2
        // C = 0

        await Task.updateMany(
          {
            boardId: task.boardId,
            status: status,
            order: {
              $gte: order,
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

      } else if (order > oldOrder) {

        // Example:
        // A = 0
        // B = 1
        // C = 2
        //
        // A → 2
        //
        // B = 0
        // C = 1
        // A = 2

        await Task.updateMany(
          {
            boardId: task.boardId,
            status: status,
            order: {
              $gt: oldOrder,
              $lte: order
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

      task.order = order;
      await task.save();
    }

    // =====================================
    // CROSS COLUMN
    // =====================================

    else {

      // OLD COLUMN:
      // Task remove hone ke baad
      // neeche wale tasks ek position upar aayenge.

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

      // NEW COLUMN:
      // Jis position par task insert hoga,
      // us position ke existing tasks neeche shift honge.

      await Task.updateMany(
        {
          boardId: task.boardId,
          status: status,
          order: {
            $gte: order
          }
        },
        {
          $inc: {
            order: 1
          }
        }
      );

      task.status = status;
      task.order = order;

      await task.save();
    }

    // =====================================
    // SOCKET EVENT
    // =====================================

    const io = getIO();

    io.to(`board:${task.boardId}`).emit(
      "task_moved",
      {
        taskId: task._id,
        boardId: task.boardId,
        status: task.status,
        order: task.order
      }
    );
 if (task.assigneeId) {
  await addTaskStatusNotificationJob({
    userId: task.assigneeId,
    taskId: task._id,
    boardId: task.boardId,
    workspaceId: board.workspace,
    message: `Task "${task.title}" moved to ${task.status} state`,
  });
}
      
    if (
  task.createrId &&
  (!task.assigneeId ||
    task.createrId.toString() !== task.assigneeId.toString())
) {
  await addTaskStatusNotificationJob({
    userId: task.createrId,
    taskId: task._id,
    boardId: task.boardId,
    workspaceId: board.workspace,
    message: `Task "${task.title}" status changed to ${task.status}`,
  });
}

    return res.status(200).json(
      new ApiResponse(
        200,
        task,
        "Task moved successfully"
      )
    );

  
  }


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

  if (member.role === "VIEWER") {
    throw new ApiError(403, "VIEWER role cannot delete tasks");
  }

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
