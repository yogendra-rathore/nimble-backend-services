const express = require("express");
const path = require("path");
const User = require("../model/user");
const router = express.Router();
const { upload } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
// const catchAsyncErrors = require("../middleware/catchAsyncErrors");
// const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const sendToken = require("../utils/jwtToken");
// const { isAuthenticated } = require("../middleware/auth");
let otp=null;
let otpExpirationTime=null;

router.post("/create-user", upload.single("file"), async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      console.log("data from UI",name,email,password);
      console.log("file",req.file);
      const userEmail = await User.findOne({ email });
  
      if (userEmail) {
        // code to handle image also not upload if user already exist
        const filename = req.file.filename;
        const filePath = `uploads/${filename}`;
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log(err);
            res.status(500).json({ message: "Error deleting file" });
          }
        });
        return next(new ErrorHandler("User already exists", 400));
      }
  
      const filename = req.file.filename;
      const fileUrl = path.join(filename);
  
      const user = {
        name: name,
        email: email,
        password: password,
        avatar: fileUrl,
      };
     otp = Math.random();
    otp = Math.floor(100000 + Math.random() * 900000);
    otp = otp.toString();
    console.log("OTP Generated",otp);
    otpExpirationTime=new Date(Date.now() + 10 * 60 * 1000);
  console.log("OTP Activation Time",otpExpirationTime);
  
      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account",
          message: `Hello ${user.name}, Please enter the given OTP to activate your account valid for 10 Minutes only :\n OTP: ${otp} \n Warm Regards,\n Nimble Support`
        });
        res.status(201).json({
          success: true,
          message: `please check your email:- ${user.email} to activate your account!`,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }

   
  });

  // activate user
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      console.log("OTP Sent To User",otp);
      
      const { name, email, password, avatar,address,userotp } = req.body;
      console.log("OTP Received From User",userotp);
      console.log("Data--",name,email,password,avatar,address);
      console.log("Expiration Time During Activation",otpExpirationTime);
      if (otpExpirationTime && otpExpirationTime > new Date()) {
      if (userotp!=otp) {
        res.status(400).json({
          success: false,
          message: "Entered OTP Is Invalid",
        });
      }
      else{
        let user = await User.findOne({ email });

        if (user) {
          res.status(400).json({
            success: false,
            message: "User Already Exist..Try Loging In",
          });
        }
        else{
          user = await User.create({
            name,
            email,
            avatar,
            password,
            address
          });
    
          res.status(201).json({
            success: true,
            message: "User Registration Successfull",
          });
        }
      }
    }
    else{
      res.status(400).json({
        success: false,
        message: "Entered OTP Is Expired",
      });
    }

     
     
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// login user
router.post(
  "/login-user",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;
      console.log("Data Received Login",email,password);

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        res.status(400).json({
          success: false,
          message: "User doesn't exists!...Please Register",
        });
      }else{
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
          res.status(400).json({
            success: false,
            message: "Invalid Credentials...Please Try Again",
          });
          
        }
        else{
          res.status(201).json({
            success: true,
            message: "User Successfully Logged In",
          });
        }
      }

  

    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// load user
router.post(
  "/getuser",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email } = req.body;
      console.log("Data Received Login Verify",email);

      const user = await User.findOne({ email });
      if (!user) {
        res.status(400).json({
          success: false,
          message: "User doesn't exists!...Please Register",
        });
      }
       else{
        res.status(200).json({
          success: true,
          user,
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.delete('/deleteUser/:userId', async (req, res) => {
  try {
      // Extract the userId from the request parameters
      const _id = req.params.userId;

      // Check if the user with the given ID exists
      const user = await User.findOne({ _id });
      if (!user) {
          return res.status(404).json({ 
            success: false,
            message: 'User not found' });
      }

      otp = Math.random();
      otp = Math.floor(100000 + Math.random() * 900000);
      otp = otp.toString();
      console.log("OTP Generated",otp);
      otpExpirationTime=new Date(Date.now() + 10 * 60 * 1000);
    console.log("OTP Activation Time",otpExpirationTime);
    
        try {
          await sendMail({
            email: user.email,
            subject: "Delete your nimble account",
            message: `Hello ${user.name}, Please enter the given OTP to delete your account, valid for 10 Minutes only :\n OTP: ${otp} \n Warm Regards,\n Nimble Support`
          });
          res.status(201).json({
            success: true,
            message: `please check your email:- ${user.email} to Delete your account!`,
          });
        } catch (error) {
          return next(new ErrorHandler(error.message, 500));
        }

      // Delete the user
     
  } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post(
  "/deleteUser/verfication",
  catchAsyncErrors(async (req, res, next) => {
    try {
      console.log("OTP Sent To User",otp);
      
      const { email,userotp } = req.body;
      console.log("OTP Received From User for account deletion",userotp);
      console.log("Expiration Time During Activation",otpExpirationTime);
      if (otpExpirationTime && otpExpirationTime > new Date()) {
      if (userotp!=otp) {
        res.status(400).json({
          success: false,
          message: "Entered OTP Is Invalid",
        });
      }
      else{
        let user = await User.findOne({ email });

        if (!user) {
          res.status(400).json({
            success: false,
            message: "User Not Exist..Try After Registering",
          });
        }
        else{
          await User.deleteOne({ email });
          res.status(200).json({
            success: true,
            message: "User Deleted Successfull",
          });
        }
      }
    }
    else{
      res.status(400).json({
        success: false,
        message: "Entered OTP Is Expired",
      });
    }

     
     
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
module.exports=router;
