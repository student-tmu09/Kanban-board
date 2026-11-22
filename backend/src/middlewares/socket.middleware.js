const jwt = require("jsonwebtoken");
const { User } = require("../models/user.model");

const DEFAULT_ACCESS_SECRET = "8-XoneRFrUp8UVCXW8oRx1kX-rFmBL57YsnMxwXs46I";

const socketAuthMiddleware = async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers?.cookie || "";
    
    // Cookie parsing
    let token = socket.handshake.auth?.token;
    if (!token && cookieHeader) {
      const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((row) => row.startsWith("Accesstoken="));
      if (match) {
        token = match.split("=")[1];
      }
    }

    if (!token) {
      console.warn("[Socket Auth] No token provided on connection attempt");
      return next(new Error("Authentication token is required"));
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || DEFAULT_ACCESS_SECRET);
    const userId = decoded.id || decoded._id;

    if (!userId) {
      return next(new Error("Invalid token payload"));
    }

    const user = await User.findById(userId).select("-password -Refreshtoken");
    if (!user) {
      return next(new Error("Unauthorized user"));
    }

    // Session tokenVersion check (if defined on both)
    if (decoded.tokenVersion && user.tokenVersion && decoded.tokenVersion !== user.tokenVersion) {
      return next(new Error("Session expired. Please login again."));
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error("[Socket Auth Error]:", error.message);
    next(new Error(error.message || "Socket authentication failed"));
  }
};

module.exports = {
  socketAuthMiddleware,
};
