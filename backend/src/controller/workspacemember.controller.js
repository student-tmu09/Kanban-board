const WorkspaceMember = require('../models/workspacemember.model');
const Workspace = require('../models/workspace.model');
const {User} = require('../models/user.model');
const {ApiError} = require('../utils/ApiError');
const { ApiResponse} = require('../utils/ApiResponse');
const { getIO } = require('../config/socket.config');


exports.addWorkspaceMember = async (req, res) => {
  const { workspaceId } = req.params;
  const { email, role } = req.body; // Role can be 'EDITOR' or 'VIEWER'
  const currentUserId = req.user.id;
  
  if (!email) {
    throw new ApiError(400, "User email is required to add member");
  }
  if(!role || role==="OWNER"){
     throw new ApiError(400, "new member can be editor or viewer");
  }

  // 1. Check workspace existence
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  // 2. Check requester permissions (Only OWNER can add/invite)
  const requesterMember = await WorkspaceMember.findOne({ workspaceId, userId: currentUserId });
  if (!requesterMember || requesterMember.role !== "OWNER") {
    throw new ApiError(403, "Only workspace OWNER can add new members");
  }

  // 3. Find target user by email
  const userToInvite = await User.findOne({ email });
  if (!userToInvite) {
    throw new ApiError(404, "User with this email does not exist");
  }

  // 4. Check if already a member
  const existingMember = await WorkspaceMember.findOne({
    workspaceId,
    userId: userToInvite._id
  });


  if (existingMember) {
    throw new ApiError(400, "User is already a member of this workspace");
  }

  // 5. Add user to Workspace
  const newMember = await WorkspaceMember.create({
    workspaceId,
    userId: userToInvite._id,
    role: role || "VIEWER" // Default role VIEWER
  });
  getIO()
  .to(`workspace:${workspaceId}`).emit(
    "add_member",
    {newMember}
  )
  getIO()
  .to(`user:${newMember.userId}`).emit(
    "add_to_workspace",workspaceId
  )
  return res
    .status(201)
    .json(new ApiResponse(201, newMember, "Member added to workspace successfully"));
};

// -------------------------------------------------------------
// 2. GET ALL MEMBERS OF A WORKSPACE
// -------------------------------------------------------------
exports.getWorkspaceMembers = async (req, res) => {
  const { workspaceId } = req.params;
  const currentUserId = req.user.id;

  // Access check: User strictly workspace member hona chahiye
  const member = await WorkspaceMember.findOne({ workspaceId, userId: currentUserId });
  if (!member) {
    throw new ApiError(403, "Access denied: You are not a member of this workspace");
  }

  const members = await WorkspaceMember.find({ workspaceId })
    .populate("userId", "name email avatar")
    .sort({ createdAt: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, members, "Workspace members fetched successfully"));
};

// -------------------------------------------------------------
// 3. UPDATE MEMBER ROLE (e.g. VIEWER -> EDITOR)
// -------------------------------------------------------------
exports.updateMemberRole = async (req, res) => {
  const { workspaceId, targetUserId } = req.params;
  const { role } = req.body; // 'EDITOR' or 'VIEWER'
  const currentUserId = req.user.id;

  if (!role || !["EDITOR", "VIEWER"].includes(role)) {
    throw new ApiError(400, "Valid role ('EDITOR' or 'VIEWER') is required");
  }

  // Requester permission check (Only OWNER can change roles)
  const requesterMember = await WorkspaceMember.findOne({ workspaceId, userId: currentUserId });
  if (!requesterMember || requesterMember.role !== "OWNER") {
    throw new ApiError(403, "Only workspace OWNER can change member roles");
  }

  // Prevent modifying self (Owner cannot demote themselves here)
  if (currentUserId.toString() === targetUserId.toString()) {
    throw new ApiError(400, "Workspace OWNER cannot change their own role");
  }

  const targetMember = await WorkspaceMember.findOne({ workspaceId, userId: targetUserId });
  if (!targetMember) {
    throw new ApiError(404, "Member not found in this workspace");
  }

  targetMember.role = role;
  await targetMember.save();
  getIO()
  .to(`workspace:${workspaceId}`).emit(
    "member_role_updated",
    {targetMember}
  )
  getIO()
  .to(`user:${targetUserId}`).emit(
    "role_updated",
    {targetMember}
  )
  return res
    .status(200)
    .json(new ApiResponse(200, targetMember, "Member role updated successfully"));
};

// -------------------------------------------------------------
// 4. REMOVE MEMBER FROM WORKSPACE
// -------------------------------------------------------------
exports.removeMember = async (req, res) => {
  const { workspaceId, targetUserId } = req.params;
  const currentUserId = req.user.id;

  const requesterMember = await WorkspaceMember.findOne({ workspaceId, userId: currentUserId });
  if (!requesterMember) {
    throw new ApiError(403, "Access denied: You are not a member of this workspace");
  }

  const isOwner = requesterMember.role === "OWNER";
  const isSelfRemoval = currentUserId.toString() === targetUserId.toString();

  // Rules:
  // - Owner non-owner members ko nikaal sakta hai.
  // - Member khud workspace chhod (Leave) sakta hai.
  // - Owner khud ko remove nahi kar sakta jab tak ownership transfer na ho.
  if (!isOwner && !isSelfRemoval) {
    throw new ApiError(403, "Only OWNER can remove other members from the workspace");
  }

  if (isOwner && isSelfRemoval) {
    throw new ApiError(400, "Workspace OWNER cannot leave/remove themselves. Transfer ownership or delete workspace.");
  }

  const targetMember = await WorkspaceMember.findOne({ workspaceId, userId: targetUserId });
  if (!targetMember) {
    throw new ApiError(404, "Member not found in this workspace");
  }

  await targetMember.deleteOne();
   getIO()
  .to(`workspace:${workspaceId}`).emit(
    "member_removed",
    {targetUserId}
  )
   getIO()
  .to(`user:${targetUserId}`).emit(
    "removed_from_workspace",
    {workspaceId}
  )
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Member removed from workspace successfully"));
};