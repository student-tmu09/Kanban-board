
const express = require("express");
const router = express.Router();

const { jwtverify } = require("../middlewares/auth.middleware");

const {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace
} = require("../controller/workspace.controller");


// 1. Create Workspace
router.post(
  "/createworkspace",
  jwtverify,
  createWorkspace
);


// 2. Get All Workspaces of Logged-in User
router.get(
  "/workspaces",
  jwtverify,
  getUserWorkspaces
);


// 3. Get Single Workspace
router.get(
  "/workspaces/:workspaceId",
  jwtverify,
  getWorkspaceById
);


// 4. Update Workspace
router.patch(
  "/workspaces/:workspaceId",
  jwtverify,
  updateWorkspace
);


// 5. Delete Workspace
router.delete(
  "/workspaces/:workspaceId",
  jwtverify,
  deleteWorkspace
);


module.exports = router;

