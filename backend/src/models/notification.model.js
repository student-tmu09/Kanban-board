const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },

    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
    },

    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

module.exports = Notification;