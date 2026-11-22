const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: ""
    },
    role: {
      type: String
    },
    Refreshtoken: {
      type: String
    },
    isInvited: {
      type: Boolean,
      default: false
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    otp: {
      type: String
    },
    otpExpiresAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);
const DEFAULT_ACCESS_SECRET = "8-XoneRFrUp8UVCXW8oRx1kX-rFmBL57YsnMxwXs46I";
const DEFAULT_REFRESH_SECRET = "oBo8DNW1DHcDKOSRMvr1ZSt9cHy0W02UMStT9p4i6tw";

userSchema.methods.generateAccesstoken = function () {
  return jwt.sign(
    {
      id: this._id,
      _id: this._id
    },
    process.env.ACCESS_TOKEN_SECRET || DEFAULT_ACCESS_SECRET,
    {
      expiresIn: "120m"
    }
  );
};

userSchema.methods.generateRefreshtoken = function () {
  return jwt.sign(
    {
      id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET || DEFAULT_REFRESH_SECRET,
    {
      expiresIn: "7d"
    }
  );
};
const User = mongoose.model('User', userSchema);

module.exports ={ User};