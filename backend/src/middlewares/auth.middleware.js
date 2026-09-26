const jwt = require("jsonwebtoken");
const { User } = require("../models/user.model");
const {ApiError}=require("../utils/ApiError")


const jwtverify = async (req, res, next) => {
    try {
        // Cookie ya Authorization header se token lo
        const token =
            req.cookies?.Accesstoken ||
            req.header("Authorization")?.replace("Bearer ", "");

   
        if (!token) {
            throw new ApiError(401, "Access token is required");
        }

        // JWT verify
        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );

        // User find karo
        const user = await User.findById(decoded.id)
            .select("-password -Refreshtoken");

        if (!user) {
            throw new ApiError(401, "Unauthorized user");
        }

        // Logout from all devices ke liye tokenVersion check
        if (decoded.tokenVersion !== user.tokenVersion) {
            throw new ApiError(
                401,
                "Session expired. Please login again."
            );
        }

        // User ko request me attach karo
        req.user = user;

        next();

    } catch (error) {
        throw new ApiError(
            401,
            error.message || "JWT verification failed"
        );
    }
};

module.exports = { jwtverify };