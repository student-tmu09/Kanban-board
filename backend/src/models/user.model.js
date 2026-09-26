const mongoose = require('mongoose');
const jwt=require("jsonwebtoken")
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    role:{
      type:String
    },
    Refreshtoken:{
      type:String
    }
  },
  {
    timestamps: true
  }
);
userSchema.methods.generateAccesstoken=function(){
   return jwt.sign(
    {
        id: this._id
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: "120m"
    }
);
}
userSchema.methods.generateRefreshtoken=function(){
   return jwt.sign(
    {
        id:this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: "7d"
    }
);
}
const User = mongoose.model('User', userSchema);

module.exports ={ User};