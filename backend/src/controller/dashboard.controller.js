const Workspace = require("../models/workspace.model");
const WorkspaceMember = require("../models/workspacemember.model");
const Board = require("../models/board.model");
const Task = require("../models/task.model");
const { ApiError } = require("../utils/ApiError");
const { ApiResponse } = require("../utils/ApiResponse");

exports.getDashboard = async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.id;

  // Check workspace
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  // Check membership
  const member = await WorkspaceMember.findOne({
    workspaceId,
    userId
  });

  if (!member) {
    throw new ApiError(
      403,
      "Access denied: You are not a member of this workspace"
    );
  }

  // Get boards
  const boards = await Board.find({
    workspace: workspaceId
  }).select("_id name slug");

  const boardIds = boards.map((board) => board._id);

  // Total members
  const totalMembers = await WorkspaceMember.countDocuments({
    workspaceId
  });

  // Total tasks
  const totalTasks = await Task.countDocuments({
    boardId: { $in: boardIds }
  });

  // Task status counts
  const todoTasks = await Task.countDocuments({
    boardId: { $in: boardIds },
    status: "TODO"
  });

  const inProgressTasks = await Task.countDocuments({
    boardId: { $in: boardIds },
    status: "IN_PROGRESS"
  });

  const completedTasks = await Task.countDocuments({
    boardId: { $in: boardIds },
    status: "DONE"
  });

  // Overdue tasks
  const overdueTasks = await Task.countDocuments({
    boardId: { $in: boardIds },
    dueDate: { $lt: new Date() },
    status: { $ne: "DONE" }
  });

  // Recent activities
  // const recentActivities = await Activity.find({
  //   workspaceId
  // })
  //   .populate("userId", "name email avatar")
  //   .populate("taskId", "title")
  //   .sort({ createdAt: -1 })

  //   .limit(10);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        workspace: {
          _id: workspace._id,
          name: workspace.name,
          slug: workspace.slug
        },

        stats: {
          totalBoards: boards.length,
          totalMembers,
          totalTasks,
          todoTasks,
          inProgressTasks,
          completedTasks,
          overdueTasks,
        },

        boards,
      },
      "Dashboard fetched successfully"
    )
  );
};

exports.getUserDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. All workspace memberships for user
    const memberships = await WorkspaceMember.find({ userId });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    // 2. Total workspaces
    const totalWorkspaces = workspaceIds.length;

    // 3. Total boards
    const boards = await Board.find({ workspace: { $in: workspaceIds } }).select("_id name");
    const totalBoards = boards.length;

    // 4. Tasks assigned to this user that are active
    const assignedTasks = await Task.countDocuments({
      assigneeId: userId,
      status: { $ne: "DONE" }
    });

    // 5. Total completed tasks for this user
    const completedTasks = await Task.countDocuments({
      assigneeId: userId,
      status: "DONE"
    });

    // 6. Unread notifications
    const Notification = require("../models/notification.model");
    const unreadNotifications = await Notification.countDocuments({
      user: userId,
      isRead: false
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalWorkspaces,
          totalBoards,
          assignedTasks,
          completedTasks,
          unreadNotifications
        },
        "User dashboard summary fetched"
      )
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};