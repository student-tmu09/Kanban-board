const jwt = require("jsonwebtoken");
const { User } = require("../models/user.model");
const { ApiError } = require("../utils/ApiError");

const DEFAULT_ACCESS_SECRET = "8-XoneRFrUp8UVCXW8oRx1kX-rFmBL57YsnMxwXs46I";

const jwtverify = async (req, res, next) => {
  try {
    // Cookie ya Authorization header se token lo
    const token =
      req.cookies?.Accesstoken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required"
      });
    }

    // JWT verify
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || DEFAULT_ACCESS_SECRET
    );

    const userId = decoded.id || decoded._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload"
      });
    }

    // User find karo
    const user = await User.findById(userId).select("-password -Refreshtoken");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user"
      });
    }

    // Session tokenVersion check (only if both are set)
    if (
      decoded.tokenVersion !== undefined &&
      user.tokenVersion !== undefined &&
      decoded.tokenVersion !== user.tokenVersion
    ) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again."
      });
    }

    // User ko request me attach karo
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || "JWT verification failed"
    });
  }
};

module.exports = { jwtverify };