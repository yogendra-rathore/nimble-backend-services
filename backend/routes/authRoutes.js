const express = require('express');
const router = express.Router();
const authController = require('../controller/userWithNewSignUpProcess');

// Route to send verification code
router.post('/send-code', authController.sendVerificationCode);

// Route to verify code
router.post('/verify-code', authController.verifyCode);

// Route to save user name
router.post('/save-name', authController.saveName);

// Route to save password
router.post('/save-password', authController.savePassword);

// Route to save card details
router.post('/save-card-details', authController.saveCardDetails);

router.post('/login-user',authController.loginUser);
router.post('/getuser',authController.getUserDetails);
router.delete('/deleteUser/:userId',authController.deleteUser);
router.post('/deleteUser/verfication',authController.userDeleteVerfication);

module.exports = router;
