
const express = require("express");
const router = express.Router();

const { jwtverify } = require("../middlewares/auth.middleware");

const {
  createTask,
  getBoardTasks,
  getTaskById,
  updateTask,
  moveTask,
  deleteTask
} = require("../controller/task.controller");


// 1. Create Task
router.post(
  "/boards/:boardId/tasks",
  jwtverify,
  createTask
);


// 2. Get All Tasks of Board
router.get(
  "/boards/:boardId/tasks",
  jwtverify,
  getBoardTasks
);


// 3. Get Single Task
router.get(
  "/tasks/:taskId",
  jwtverify,
  getTaskById
);


// 4. Update Task
router.patch(
  "/tasks/:taskId",
  jwtverify,
  updateTask
);


// 5. Move Task / Drag & Drop
router.patch(
  "/tasks/:taskId/move",
  jwtverify,
  moveTask
);


// 6. Delete Task
router.delete(
  "/tasks/:taskId",
  jwtverify,
  deleteTask
);                              

module.exports = router;

