const WorkspaceMember = require('../models/workspacemember.model');
const Workspace = require('../models/workspace.model');
const {User} = require('../models/user.model');
const {ApiError} = require('../utils/ApiError');
const { ApiResponse} = require('../utils/ApiResponse');
const { getIO } = require('../config/socket.config');
const { createAndSendNotification } = require('../services/notification.services');
const { sendWorkspaceInviteEmail } = require('../services/email.services');


// -------------------------------------------------------------
// 0. GET AVAILABLE REGISTERED USERS FOR A WORKSPACE
// -------------------------------------------------------------
exports.getAvailableUsersForWorkspace = async (req, res) => {
  const { workspaceId } = req.params;
  const currentUserId = req.user.id;

  // Check workspace existence
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  // Requester must be workspace member
  const requesterMember = await WorkspaceMember.findOne({ workspaceId, userId: currentUserId });
  if (!requesterMember) {
    throw new ApiError(403, "Access denied: You are not a member of this workspace");
  }

  // Get all existing member user IDs
  const existingMembers = await WorkspaceMember.find({ workspaceId }).select("userId");
  const existingUserIds = existingMembers.map((m) => m.userId.toString());

  if (workspace.owner) {
    existingUserIds.push(workspace.owner.toString());
  }

  // Only list REGISTERED & VERIFIED users who are not already in this workspace
  const availableUsers = await User.find({
    _id: { $nin: existingUserIds },
    isVerified: true
  })
    .select("_id name email avatar")
    .sort({ name: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, availableUsers, "Available registered users fetched successfully"));
};

// -------------------------------------------------------------
// 1. ADD MEMBER TO WORKSPACE (Only Registered Users)
// -------------------------------------------------------------
exports.addWorkspaceMember = async (req, res) => {
  const { workspaceId } = req.params;
  const { userId, email } = req.body;
  const currentUserId = req.user.id;
  
  const memberRole = "MEMBER";

  // 1. Check workspace existence
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  // 2. Check requester permissions (Only OWNER can add members)
  const requesterMember = await WorkspaceMember.findOne({ workspaceId, userId: currentUserId });
  const isOwner =
    (requesterMember && requesterMember.role === "OWNER") ||
    (workspace.owner && workspace.owner.toString() === currentUserId.toString());

  if (!isOwner) {
    throw new ApiError(403, "Sirf workspace OWNER hi naye members ko invite/add kar sakta hai");
  }

  // 3. Find target user - STRICT CHECK: ONLY registered verified users can be added!
  let userToInvite = null;
  if (userId) {
    userToInvite = await User.findOne({ _id: userId, isVerified: true });
  } else if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    userToInvite = await User.findOne({ email: cleanEmail, isVerified: true });
  }

  if (!userToInvite) {
    throw new ApiError(
      400,
      "Sirf registered users ko hi add kiya ja sakta hai. Kripya list me se registered user ko chunein."
    );
  }

  // 4. Check if already a member
  const existingMember = await WorkspaceMember.findOne({
    workspaceId,
    userId: userToInvite._id
  });

  if (existingMember) {
    throw new ApiError(400, `User "${userToInvite.name}" (${userToInvite.email}) is already a member of this workspace`);
  }

  // 5. Add user to Workspace
  const newMember = await WorkspaceMember.create({
    workspaceId,
    userId: userToInvite._id,
    role: memberRole
  });

  // In-app notification
  createAndSendNotification({
    userId: userToInvite._id,
    type: "workspace_invite",
    message: `You have been added to workspace "${workspace.name}" with role ${memberRole}`,
    workspaceId
  }).catch((e) => console.warn(e.message));

  // Socket IO broadcasts
  try {
    const io = getIO();
    if (io) {
      io.to(`workspace:${workspaceId}`).emit("add_member", { newMember });
      io.to(`user:${newMember.userId}`).emit("add_to_workspace", workspaceId);
    }
  } catch (ioErr) {
    console.warn("Socket broadcast error:", ioErr.message);
  }

  // Send Notification Email via Gmail SMTP asynchronously
  (async () => {
    try {
      const inviterUser = await User.findById(currentUserId).select("name email");
      await sendWorkspaceInviteEmail({
        inviteeEmail: userToInvite.email,
        inviteeName: userToInvite.name,
        inviterName: inviterUser?.name || "Workspace Admin",
        workspaceName: workspace.name,
        workspaceId: workspace._id,
        role: memberRole,
        isNewUser: false,
        tempPassword: null,
      });
    } catch (mailErr) {
      console.warn("[Workspace Invite Email] Error sending email:", mailErr.message);
    }
  })();

  const populatedMember = await WorkspaceMember.findById(newMember._id)
    .populate("userId", "name email avatar");

  return res
    .status(201)
    .json(new ApiResponse(201, populatedMember, `User "${userToInvite.name}" added to workspace successfully`));
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
// 3. UPDATE MEMBER ROLE (OWNER or MEMBER)
// -------------------------------------------------------------
exports.updateMemberRole = async (req, res) => {
  const { workspaceId, targetUserId } = req.params;
  const { role } = req.body;
  const currentUserId = req.user.id;

  if (!role || !["OWNER", "MEMBER"].includes(role)) {
    throw new ApiError(400, "Valid role ('OWNER' or 'MEMBER') is required");
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

  const workspace = await Workspace.findById(workspaceId);
  await createAndSendNotification({
    userId: targetUserId,
    type: "role_updated",
    message: `Your role in workspace "${workspace ? workspace.name : "Workspace"}" was updated to ${role}`,
    workspaceId
  });

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

  const workspace = await Workspace.findById(workspaceId);
  const isOwner =
    requesterMember.role === "OWNER" ||
    (workspace?.owner && workspace.owner.toString() === currentUserId.toString());
  const isSelfRemoval = currentUserId.toString() === targetUserId.toString();

  // Rules:
  // - Only OWNER can remove other members from the workspace.
  // - Member can leave workspace themselves (isSelfRemoval).
  // - Owner cannot remove themselves without transferring ownership.
  if (!isOwner && !isSelfRemoval) {
    throw new ApiError(403, "Sirf workspace OWNER hi members ko remove kar sakta hai");
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