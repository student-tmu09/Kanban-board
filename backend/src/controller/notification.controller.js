const Notification = require("../models/notification.model");
const { ApiResponse } = require("../utils/ApiResponse");

getNotifications = async (req, res) => {
  const notifications = await Notification.find({
    user: req.user.id
  })
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      notifications,
      "Notifications fetched successfully"
    )
  );
};
markAsRead = async (req, res) => {
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
};
module.exports={markAsRead,getNotifications}