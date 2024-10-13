const User = require('../model/userUpdated');
const VerificationCode = require('../model/verficationCode');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendMailWithoutFile } = require('../utils/sendMail');


// Generate random verification code
const generateVerificationCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// Step 1: Send email verification code
exports.sendVerificationCode = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    // Generate verification code and expiration time (5 minutes)
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save or update verification code
    await VerificationCode.findOneAndUpdate(
      { email },
      { code, expiresAt },
      { upsert: true }
    );


    try {
      await sendMailWithoutFile({
        email: email,
        subject: "Activate your account",
        message: `Hello ${email.split('@')[0]}, Please enter the given OTP to activate your account valid for 10 Minutes only :\n OTP: ${code} \n Warm Regards,\n Nimble Support`
      });
      res.status(201).json({
        success: true,
        message: `please check your email:- ${email} to activate your account!`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }

    
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Step 2: Verify code and store email
exports.verifyCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    // Find the verification code in DB
    const verification = await VerificationCode.findOne({ email, code });

    if (!verification || verification.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired code.' });
    }

    // Proceed to the next step (asking for the user's name)
    res.status(200).json({ message: 'Verification successful. Proceed to enter name.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Step 3: Save name
exports.saveName = async (req, res) => {
  const { email, name } = req.body;

  try {
    // Update user with name
    await User.findOneAndUpdate({ email }, { name }, { upsert: true });
    res.status(200).json({ message: 'Name saved. Proceed to enter password.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Step 4: Save password
exports.savePassword = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user with hashed password
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    res.status(200).json({ message: 'Password saved. Proceed to enter card details.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Step 5: Save card details
exports.saveCardDetails = async (req, res) => {
  const { email, cardNumber, expiryDate, cvv } = req.body;

  try {
    // Save card details (no encryption used here; it's best practice to encrypt sensitive data)
    await User.findOneAndUpdate(
      { email },
      { cardDetails: { cardNumber, expiryDate, cvv } }
    );

    res.status(200).json({ message: 'Card details saved successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


// login user
exports.loginUser=async (req, res, next) => {
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
}

exports.getUserDetails=async (req, res, next) => {
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
}


exports.deleteUser=async (req, res) => {
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

      let otp = Math.random();
      otp = Math.floor(100000 + Math.random() * 900000);
      otp = otp.toString();
      console.log("OTP Generated",otp);
      let otpExpirationTime=new Date(Date.now() + 10 * 60 * 1000);
    console.log("OTP Activation Time",otpExpirationTime);
    
        try {
          await sendMailWithoutFile({
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
}


exports.userDeleteVerfication=async (req, res, next) => {
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
}

