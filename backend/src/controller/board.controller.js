
const Board = require('../models/board.model');
const WorkspaceMember = require('../models/workspacemember.model');
const Task = require('../models/task.model');
const {ApiError} = require('../utils/ApiError');
const {ApiResponse}  = require('../utils/ApiResponse');

const {getIO}=require("../config/socket.config")

// Helper Function: Workspace Membership & Role Check
const checkWorkspaceMember = async (workspaceId, userId) => {
  const member = await WorkspaceMember.findOne({ workspaceId, userId });
  if (!member) {
    throw new ApiError(403, "Access denied: You are not a member of this workspace");
  }
  return member;
};

// -------------------------------------------------------------
// 1. CREATE BOARD
// -------------------------------------------------------------
exports.createboard = async (req, res) => {
  const { workspaceId } = req.params; // ya req.body
  const { name, slug } = req.body;
  const userId = req.user.id;

  if (!name || !slug) {
    throw new ApiError(400, "Board name is required");
  }

  // Permission Check: Sirf workspace OWNER hi board create kar sakta hai
  const member = await checkWorkspaceMember(workspaceId, userId);
  if (!member || member.role !== "OWNER") {
    throw new ApiError(403, "Sirf workspace OWNER hi board create kar sakta hai");
  }

  const board = await Board.create({
    name,
    slug,
    workspace:workspaceId,
    createdBy: userId
  });
  getIO().to(`workspace:${workspaceId}`)
  .emit("board_created",{
    board
  })
  
  return res
    .status(201)
    .json(new ApiResponse(201, board, "Board created successfully"));
};

// -------------------------------------------------------------
// 2. GET ALL BOARDS OF A WORKSPACE
// -------------------------------------------------------------
exports.getWorkspaceBoards = async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.id;

  // Ensure user belongs to the workspace
  await checkWorkspaceMember(workspaceId, userId);

  const boards = await Board.find({ workspace:workspaceId }).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, boards, "Workspace boards fetched successfully"));
};

// -------------------------------------------------------------
// 3. GET SINGLE BOARD DETAILS
// -------------------------------------------------------------
exports.getBoardById = async (req, res) => {
  const { boardId } = req.params;
  const userId = req.user.id;

  if (!boardId) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await Board.findById(boardId);
  if (!board) {

    throw new ApiError(404, "Board not found");
  }

  // Access check on parent workspace
  await checkWorkspaceMember(board.workspace, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, board, "Board details fetched successfully"));
};

// -------------------------------------------------------------
// 4. UPDATE BOARD (Name / Description)
// -------------------------------------------------------------
exports.updateBoard = async (req, res) => {
  const { boardId } = req.params;
  const { name,slug } = req.body;
  const userId = req.user.id;

  if (!boardId) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await Board.findById(boardId);
  if (!board) {
    throw new ApiError(404, "Board not found");
  }

  const member = await checkWorkspaceMember(board.workspace, userId);
  if (!member || member.role !== "OWNER") {
    throw new ApiError(403, "Sirf workspace OWNER hi board update kar sakta hai");
  }

  if (name !== undefined) board.name = name;

  await board.save();
  
   getIO().to(`workspace:${board.workspace}`)
   .emit("board_updated",{
    board
  })
  return res
    .status(200)
    .json(new ApiResponse(200, board, "Board updated successfully"));
};

// -------------------------------------------------------------
// 5. DELETE BOARD
// -------------------------------------------------------------
exports.deleteBoard = async (req, res) => {
  const { boardId } = req.params;
  const userId = req.user.id;

  if (!boardId) {
    throw new ApiError(400, "Board ID is required");
  }

  const board = await Board.findById(boardId);
  if (!board) {
    throw new ApiError(404, "Board not found");
  }

  const member = await checkWorkspaceMember(board.workspace, userId);
  if (!member || member.role !== "OWNER") {
    throw new ApiError(403, "Sirf workspace OWNER hi board delete kar sakta hai");
  }

  // Cleanup: Board ke saath judey saare Tasks bhi delete karein
  await Task.deleteMany({ boardId: board._id });
  await board.deleteOne();
   getIO().to(`workspace:${board.workspace}`).emit("board_deleted",{
    boardId
  })
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Board and associated tasks deleted successfully"));
};

exports.getBoardTasks = async (req, res) => {
  try {
    const { boardId } = req.params;

    const {
      status,
      assigneeId,
      createrId,
      dueDate,
      search,
      sort,
    } = req.query;

    const filter = {
      boardId,
    };

    // Status
    if (status) {
      filter.status = status;
    }

    // Assignee
    if (assigneeId) {
      filter.assigneeId = assigneeId;
    }

    // Creator
    if (createrId) {
      filter.createrId = createrId;
    }

    // Due date
    if (dueDate) {
      filter.dueDate = dueDate;
    }

    // Search
    if (search) {
      filter.title = {
        $regex: search,
        $options: "i",
      };
    }

    // Sort
    let sortOption = { createdAt: -1 };

    if (sort === "dueDate") {
      sortOption = { dueDate: 1 };
    }

    if (sort === "newest") {
      sortOption = { createdAt: -1 };
    }

    if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    const tasks = await Task.find(filter)
      .sort(sortOption)
      .populate("assigneeId", "name email")
      .populate("createrId", "name email");

    return res.status(200).json(
      new ApiResponse(
        200,
        tasks,
        "Tasks fetched successfully"
      )
    );

  } catch (error) {
    throw error;
  }
};