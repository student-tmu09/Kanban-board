const { User } = require("../models/user.model");
const {ApiError}=require("../utils/ApiError")
const {ApiResponse}=require("../utils/ApiResponse")
const {emailQueue}=require("../queues/email.queue")
const jwt=require("jsonwebtoken")
const { getIO } =require("../config/socket.config");
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check required fields
        if (!name || !email || !password ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists"
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password
        });
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const loginuser=async(req,res)=>{
  const {email,password}=req.body
  if(!email ||!password){
    throw new ApiError(400,"this is required")
  }
  const user=await User.findOne({email})
  if(!user){
     throw new ApiError(400,"user not find")
  }
  const Accesstoken=user.generateAccesstoken()
  const Refreshtoken=user.generateRefreshtoken()

  user.Refreshtoken=Refreshtoken
  await user.save()
  res.status(200)
  .cookie("Accesstoken",Accesstoken , {
    httpOnly: true,
    secure: false,
       sameSite: "lax",
  })
  .cookie("Refreshtoken",Refreshtoken,{
     httpOnly: true,
    secure: false,
       sameSite: "lax",
  })
  .json(  new ApiResponse(
        200,
        {
          Refreshtoken,
          Accesstoken,
          user: {
            id: user._id,
            email: user.email
          }
        },
        "Login successful"
      )
    );
}
const getcurrentuser=async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,{
        user:req.user
    },
    "current user fetched"
))
}
module.exports = { registerUser,loginuser,getcurrentuser};