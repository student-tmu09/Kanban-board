const express = require("express");
const router = express.Router();

const {
  registerUser,
  verifyOtp,
  resendOtp,
  loginuser,
  logoutuser,
  getcurrentuser
} = require("../controller/user.controller");
const { jwtverify } = require("../middlewares/auth.middleware");

router.post("/register", registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", loginuser);
router.post("/logout", logoutuser);
router.get("/getcurrentuser", jwtverify, getcurrentuser);

module.exports = router;
