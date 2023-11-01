const express = require("express");
const path = require("path");
const User = require("../model/user");
const router = express.Router();
const { upload } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
// const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const Seller = require("../model/seller");
// const sendToken = require("../utils/jwtToken");
// const { isAuthenticated } = require("../middleware/auth");

router.post("/create-seller", upload.single("file"), async (req, res, next) => {
    try {
      const { name, email, password,phoneNumber,address,zipCode } = req.body;
      const sellerEmail = await Seller.findOne({ email });
  
      if (sellerEmail) {
        const filename = req.file.filename;
        const filePath = `uploads/${filename}`;
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log(err);
            res.status(500).json({ message: "Error deleting file" });
          }
        });
        return next(new ErrorHandler("Seller already exists", 400));
      }
  
      const filename = req.file.filename;
      const fileUrl = path.join(filename);
  
      const seller = {
        name: name,
        email: email,
        password: password,
        phoneNumber: phoneNumber,
        zipCode: zipCode,
        address: address,
        avatar: fileUrl,
      };

      const newSeller=await Seller.create(seller);
      console.log("Shop Details Saved Successfully");
      res.status(201).json({
        success: true,
        newSeller
      })
  
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }

   
  });

  router.post(
    "/login-vendor",
    catchAsyncErrors(async (req, res, next) => {
      try {
        const { email, password } = req.body;
        console.log("Data Received Login",email,password);
  
        const user = await Seller.findOne({ email }).select("+password");
        const cleanObject=await Seller.findOne({ email }).select("-password");
  
        if (!user) {
          res.status(400).json({
            success: false,
            message: "Vendor doesn't exists!...Please Contact App Admin",
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
              message: cleanObject
            });
          }
        }
  
    
  
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
    })
  );
  // activate user


  module.exports=router;