const express = require("express");
const { getNotifications, markAsRead, markAllAsRead } = require("../controller/notification.controller");
const { jwtverify } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/notifications", jwtverify, getNotifications);
router.patch("/notifications/read-all", jwtverify, markAllAsRead);
router.patch("/notifications/:notificationId/read", jwtverify, markAsRead);

module.exports = router;
