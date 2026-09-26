const express = require("express");

const router = express.Router();

const {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment,
} = require("../controller/comment.controller");

const { jwtverify } = require("../middlewares/auth.middleware");


// CREATE
router.post(
  "/tasks/:taskId/comments",
  jwtverify,
  createComment
);


// GET
router.get(
  "/tasks/:taskId/comments",
  jwtverify,
  getTaskComments
);


// UPDATE
router.patch(
  "/comments/:commentId",
  jwtverify,
  updateComment
);


// DELETE
router.delete(
  "/comments/:commentId",
  jwtverify,
  deleteComment
);


module.exports = router;