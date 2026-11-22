const express = require("express");
const router = express.Router();

const { jwtverify } = require("../middlewares/auth.middleware");

const {
  getDashboard,
  getUserDashboardSummary
} = require("../controller/dashboard.controller");

router.get(
  "/dashboard/summary",
  jwtverify,
  getUserDashboardSummary
);

router.get(
  "/workspaces/:workspaceId/dashboard",
  jwtverify,
  getDashboard
);

module.exports = router;