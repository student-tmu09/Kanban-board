const Comment = require("../models/comment.model");
const Task = require("../models/task.model");
const { ApiError } = require("../utils/ApiError");
const { ApiResponse } = require("../utils/ApiResponse");

// CREATE COMMENT
exports.createComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      throw new ApiError(400, "Comment content is required");
    }

    const task = await Task.findById(taskId);

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    const comment = await Comment.create({
      taskId,
      authorId:userId,
      content: content.trim(),
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate("authorId", "name email");

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          populatedComment,
          "Comment created successfully"
        )
      );

  } catch (error) {
    throw new ApiError(400,error)
  }
};


// GET COMMENTS
exports.getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    const comments = await Comment.find({ taskId })
      .populate("authorId", "name email")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          comments,
          "Comments fetched successfully"
        )
      );

  } catch (error) {
    throw error;
  }
};


// UPDATE COMMENT
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      throw new ApiError(400, "Comment content is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }

    // Only comment owner can edit
    if (comment.authorId.toString() !== authorId.toString()) {
      throw new ApiError(
        403,
        "You can only update your own comment"
      );
    }

    comment.content = content.trim();

    await comment.save();

    const updatedComment = await Comment.findById(comment._id)
      .populate("userId", "name email");

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedComment,
          "Comment updated successfully"
        )
      );

  } catch (error) {
    throw error;
  }
};


// DELETE COMMENT
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }

    // Only comment owner can delete
    if (comment.authorId.toString() !== authorId.toString()) {
      throw new ApiError(
        403,
        "You can only delete your own comment"
      );
    }

    await Comment.findByIdAndDelete(commentId);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "Comment deleted successfully"
        )
      );

  } catch (error) {
    throw error;
  }
};
