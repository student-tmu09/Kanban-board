const express = require("express");
const router = express.Router();

const { jwtverify } = require("../middlewares/auth.middleware");

const {
  getDashboard
} = require("../controller/dashboard.controller");

router.get(
  "/workspaces/:workspaceId/dashboard",
  jwtverify,
  getDashboard
);

module.exports = router;