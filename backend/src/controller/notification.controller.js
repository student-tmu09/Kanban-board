const Notification = require("../models/notification.model");
const { ApiResponse } = require("../utils/ApiResponse");

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user.id
    }).sort({ createdAt: -1 });

    return res.status(200).json(
      new ApiResponse(
        200,
        notifications,
        "Notifications fetched successfully"
      )
    );
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.notificationId,
        user: req.user.id
      },
      {
        isRead: true
      },
      {
        new: true
      }
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        notification,
        "Notification marked as read"
      )
    );
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        user: req.user.id,
        isRead: false
      },
      {
        isRead: true
      }
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {},
        "All notifications marked as read"
      )
    );
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
