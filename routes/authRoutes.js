const express = require("express");
const {
  validateRegisterInput,
} = require("../middlewares/validationMiddleware");
const {
  registerUser,
  loginUser,
  verifyOTP,
  verifyLoginOTP,
  logoutUser,
} = require("../controllers/authController");
const authenticate = require("../middlewares/authenticate"); // Assuming the middleware is in 'middlewares/authenticate.js'

const router = express.Router();

// Register endpoint
router.post("/register", validateRegisterInput, registerUser);
// POST route for OTP verification
router.post("/verifyOTP", verifyOTP);
//post route for login
router.post("/login", loginUser);
//post route for login OTP verification
router.post("/verifyLoginOTP", verifyLoginOTP);
router.post("/", authenticate, (req, res) => {
  res.status(200).json({});
});
router.post("/logout", logoutUser);

module.exports = router;
