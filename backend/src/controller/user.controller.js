const { User } = require("../models/user.model");
const { ApiError } = require("../utils/ApiError");
const { ApiResponse } = require("../utils/ApiResponse");
const jwt = require("jsonwebtoken");
const { getIO } = require("../config/socket.config");
const { sendOtpEmail } = require("../services/email.services");

const generate6DigitOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;

    // Check required fields
    if (!name || !name.trim() || !email || !email.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required"
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      // If user is already verified and not an invited placeholder
      if (existingUser.isVerified && !existingUser.isInvited) {
        return res.status(409).json({
          success: false,
          message: "A user with this email already exists and is verified. Please log in."
        });
      }

      // If user was invited or unverified, update details and send fresh OTP
      const otp = generate6DigitOtp();
      existingUser.name = cleanName;
      existingUser.password = password;
      if (avatar) existingUser.avatar = avatar;
      existingUser.isVerified = false;
      existingUser.isInvited = false;
      existingUser.otp = otp;
      existingUser.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await existingUser.save();

      // Dispatch OTP Email
      sendOtpEmail({
        email: cleanEmail,
        name: cleanName,
        otp
      }).catch((e) => console.warn(e.message));

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            requireOtp: true,
            email: cleanEmail
          },
          "Verification code sent to your Gmail. Please verify to complete registration."
        )
      );
    }

    // Brand new user registration -> generate 6-digit OTP
    const otp = generate6DigitOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      avatar: avatar || "",
      isVerified: false,
      otp,
      otpExpiresAt
    });

    // Dispatch OTP Email
    sendOtpEmail({
      email: cleanEmail,
      name: cleanName,
      otp
    }).catch((e) => console.warn(e.message));

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          requireOtp: true,
          email: cleanEmail
        },
        "Verification code sent to your Gmail. Please verify to complete registration."
      )
    );
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Registration failed"
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email"
      });
    }

    if (user.isVerified) {
      const Accesstoken = user.generateAccesstoken();
      const Refreshtoken = user.generateRefreshtoken();
      user.Refreshtoken = Refreshtoken;
      await user.save();

      return res
        .status(200)
        .cookie("Accesstoken", Accesstoken, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
        })
        .cookie("Refreshtoken", Refreshtoken, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
        })
        .json(
          new ApiResponse(
            200,
            {
              user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar || "",
                role: user.role || ""
              },
              Accesstoken,
              Refreshtoken
            },
            "Account already verified! Logged in successfully."
          )
        );
    }

    if (!user.otp || user.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code. Please check your Gmail."
      });
    }

    if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please click Resend Code."
      });
    }

    // Mark user verified and clear OTP
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;

    const Accesstoken = user.generateAccesstoken();
    const Refreshtoken = user.generateRefreshtoken();
    user.Refreshtoken = Refreshtoken;
    await user.save();

    return res
      .status(200)
      .cookie("Accesstoken", Accesstoken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      })
      .cookie("Refreshtoken", Refreshtoken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      })
      .json(
        new ApiResponse(
          200,
          {
            user: {
              id: user._id,
              _id: user._id,
              name: user.name,
              email: user.email,
              avatar: user.avatar || "",
              role: user.role || ""
            },
            Accesstoken,
            Refreshtoken
          },
          "Gmail verified successfully! Welcome to KanbanFlow."
        )
      );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Verification failed"
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "This email is already verified. Please log in."
      });
    }

    const otp = generate6DigitOtp();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    sendOtpEmail({
      email: cleanEmail,
      name: user.name,
      otp
    }).catch((e) => console.warn(e.message));

    return res.status(200).json(
      new ApiResponse(200, { email: cleanEmail }, "A new verification code has been sent to your Gmail.")
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to resend verification code"
    });
  }
};

const loginuser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found with this email"
      });
    }

    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }

    // If user registered but never verified OTP
    if (user.isVerified === false) {
      const otp = generate6DigitOtp();
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      sendOtpEmail({
        email: user.email,
        name: user.name,
        otp
      }).catch((e) => console.warn(e.message));

      return res.status(403).json({
        success: false,
        requireOtp: true,
        email: user.email,
        message: "Your Gmail is not verified yet. A verification code has been sent to your email."
      });
    }

    const Accesstoken = user.generateAccesstoken();
    const Refreshtoken = user.generateRefreshtoken();

    user.Refreshtoken = Refreshtoken;
    await user.save();

    return res
      .status(200)
      .cookie("Accesstoken", Accesstoken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      })
      .cookie("Refreshtoken", Refreshtoken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      })
      .json(
        new ApiResponse(
          200,
          {
            Refreshtoken,
            Accesstoken,
            user: {
              id: user._id,
              _id: user._id,
              name: user.name,
              email: user.email,
              avatar: user.avatar || "",
              role: user.role
            }
          },
          "Login successful"
        )
      );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const logoutuser = async (req, res) => {
  try {
    res.clearCookie("Accesstoken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    res.clearCookie("Refreshtoken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    return res.status(200).json(new ApiResponse(200, {}, "Logged out successfully"));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getcurrentuser = async (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: req.user._id,
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar || "",
          role: req.user.role
        }
      },
      "current user fetched"
    )
  );
};

module.exports = {
  registerUser,
  verifyOtp,
  resendOtp,
  loginuser,
  logoutuser,
  getcurrentuser
};
