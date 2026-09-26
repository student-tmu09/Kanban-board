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