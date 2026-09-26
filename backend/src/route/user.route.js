const express = require("express");
const router = express.Router();

const { registerUser ,loginuser,getcurrentuser} = require("../controller/user.controller");
const {jwtverify}=require("../middlewares/auth.middleware")

router.post("/register", registerUser);
router.post("/login", loginuser);
router.get("/getcurrentuser",jwtverify,getcurrentuser)

module.exports = router;