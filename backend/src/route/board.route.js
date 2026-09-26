
const express = require("express");
const router = express.Router();

const { jwtverify } = require("../middlewares/auth.middleware");

const {
  createboard,
  getWorkspaceBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  getBoardTasks 

} = require("../controller/board.controller");


// 1. Create Board
router.post(
  "/workspaces/:workspaceId/boards",
  jwtverify,
  createboard
);


// 2. Get All Boards of Workspace
router.get(
  "/workspaces/:workspaceId/boards",
  jwtverify,
  getWorkspaceBoards
);


// 3. Get Single Board
router.get(
  "/boards/:boardId",
  jwtverify,
  getBoardById
);
router.get(
  "/boards/:boardId/tasks",
  jwtverify,
getBoardTasks 
);


// 4. Update Board
router.patch(
  "/boards/:boardId",
  jwtverify,
  updateBoard
);


// 5. Delete Board
router.delete(
  "/boards/:boardId",
  jwtverify,
  deleteBoard
);


module.exports = router;

