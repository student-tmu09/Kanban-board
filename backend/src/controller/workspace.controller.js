const { getIO } = require("../config/socket.config");
const Workspace = require("../models/workspace.model");
const WorkspaceMember= require("../models/workspacemember.model");
const Board = require("../models/board.model");
const Task = require("../models/task.model");
const {workspaceCreateNotification}=require("../queues/email.queue")
const{ ApiError} = require('../utils/ApiError');
const {ApiResponse} = require('../utils/ApiResponse');

// 1. CREATE WORKSPACE
exports.createWorkspace = async (req, res) => {
  const { name, slug,} = req.body;
  const userId = req.user.id;

  if (!name || !slug) {
    throw new ApiError(400, "Workspace name and slug is required");
  }

  // Create Workspace
  const workspace = await Workspace.create({
    name,
    slug,
    owner: userId,
  
  });

  // Creator ko OWNER member ke roop me add karo
  await WorkspaceMember.create({
    workspaceId: workspace._id,
    userId,
    role: "OWNER"
  });
  const io=getIO()
  io.to(`user:${userId}`).emit(
    "workspace_created",
    {workspace}
  )
  await workspaceCreateNotification({
    userId,
    workspaceId:workspace._id
  })
  return res
    .status(201)
    .json(new ApiResponse(201, workspace, "Workspace created successfully"));
};

// 2. GET ALL WORKSPACES FOR LOGGED-IN USER
exports.getUserWorkspaces = async (req, res) => {
  const userId = req.user.id;

  // Un sabhi Workspaces ko dhoondo jisme user member hai
  const memberships = await WorkspaceMember.find({ userId })
    .populate("workspaceId")
    .sort({ createdAt: -1 });

  const workspaces = memberships.map((m) => m.workspaceId);

  return res
    .status(200)
    .json(new ApiResponse(200, workspaces, "User workspaces fetched successfully"));
};

// 3. GET SINGLE WORKSPACE DETAILS
exports.getWorkspaceById = async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.id;

  if (!workspaceId) {
    throw new ApiError(400, "Workspace ID is required");
  }

  // Check Membership
  const member = await WorkspaceMember.findOne({ workspaceId, userId });
  if (!member) {
    throw new ApiError(403, "Access denied: You are not a member of this workspace");
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { workspace, currentRole: member.role }, "Workspace details fetched"));
};

// 4. UPDATE WORKSPACE
exports.updateWorkspace = async (req, res) => {
  const { workspaceId } = req.params;
  const { name, slug } = req.body;
  const userId = req.user.id;

  if (!workspaceId) {
    throw new ApiError(400, "Workspace ID is required");
  }

  // Check if user is OWNER
  const member = await WorkspaceMember.findOne({ workspaceId, userId });
  if (!member || member.role !== "OWNER") {
    throw new ApiError(403, "Only workspace OWNER can update workspace details");
  }

  const workspace = await Workspace.findByIdAndUpdate(
    workspaceId,
    { name,
      slug
     },
    { new: true, runValidators: true }
  );
  const io=getIO() 
  io.to(`workspace:${workspaceId}`).emit(
    "workspace_updated",
    {workspace}
  )
  return res
    .status(200)
    .json(new ApiResponse(200, workspace, "Workspace updated successfully"));
};

// 5. DELETE WORKSPACE
exports.deleteWorkspace = async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.id;

  if (!workspaceId) {
    throw new ApiError(400, "Workspace ID is required");
  }

  const member = await WorkspaceMember.findOne({ workspaceId, userId });
  if (!member || member.role !== "OWNER") {
    throw new ApiError(403, "Only workspace OWNER can delete this workspace");
  }

  // Workspace aur uske saare members clear karein
  await Workspace.findByIdAndDelete(workspaceId);
  await WorkspaceMember.deleteMany({ workspaceId });
  await Task.deleteMany({boardId: { $in: boardIds }});
  await Board.deleteMany({ workspace:workspaceId });

  // (Optional) Yahan Board aur Tasks ka clean up trigger kar sakte hain
  const io=getIO()
  io.to(`workspace:${workspaceId}`).emit(
    "workspace_deleted",
    {workspaceId}
  )
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Workspace deleted successfully"));
};