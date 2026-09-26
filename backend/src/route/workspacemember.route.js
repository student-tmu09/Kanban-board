const express = require("express");
const router = express.Router();

const { jwtverify } = require("../middlewares/auth.middleware");

const {
  addWorkspaceMember,
  getWorkspaceMembers,
  updateMemberRole,
  removeMember
} = require("../controller/workspacemember.controller");

// 1. Add member to workspace
router.post(
  "/workspaces/:workspaceId/members",
  jwtverify,
  addWorkspaceMember
);

// 2. Get all workspace members
router.get(
  "/workspaces/:workspaceId/members",
  jwtverify,
  getWorkspaceMembers
);

// 3. Update member role
router.patch(
  "/workspaces/:workspaceId/members/:targetUserId",
  jwtverify,
  updateMemberRole
);

// 4. Remove member / Leave workspace
router.delete(
  "/workspaces/:workspaceId/members/:targetUserId",
  jwtverify,
  removeMember
);

module.exports = router;