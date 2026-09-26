const jwt = require("jsonwebtoken");
const { User } = require("../models/user.model");

const socketAuthMiddleware = async (socket, next) => {
  try {

    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.cookie
        ?.split("; ")
        .find((row) =>
          row.startsWith("Accesstoken=")
        )
        ?.split("=")[1];

    if (!token) {
      return next(
        new Error("Authentication token is required")
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decoded._id)
      .select("-password -Refreshtoken");

    if (!user) {
      return next(
        new Error("Unauthorized user")
      );
    }

    if (
      decoded.tokenVersion !==
      user.tokenVersion
    ) {
      return next(
        new Error(
          "Session expired. Please login again."
        )
      );
    }

    socket.user = user;

    next();

  } catch (error) {

    next(
      new Error(
        error.message ||
        "Socket authentication failed"
      )
    );

  }
};

module.exports = {
  socketAuthMiddleware,
};