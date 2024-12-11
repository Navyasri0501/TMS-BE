const { findUserById, findUserByEmail } = require("../models/userModel");
const { findUserOtpById } = require("../models/userOtpModel");

const validateRegisterInput = async (req, res, next) => {
  const { username, email, password, confirmPassword } = req.body;

  try {
    // Check if `username` already exists in `users` table
    const userById = await findUserById(username);
    if (userById.length > 0) {
      return res.status(400).json({
        status: "error",
        message:
          "The provided username is already in use. Please choose another username.",
      });
    }

    // Check if `email` already exists in `users` table
    const userByEmail = await findUserByEmail(email);
    if (userByEmail.length > 0) {
      return res.status(400).json({
        status: "error",
        message:
          "The email address is already registered. Please try another email.",
      });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "The email format is invalid.",
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        status: "error",
        message: "Password and confirm password do not match.",
      });
    }

    // Check if `username` exists in `user_otp` table
    const userOtpById = await findUserOtpById(username);
    if (userOtpById.length > 0) {
      // If exists, set flag to overwrite data
      req.overwriteUserOtp = true;
    } else {
      // If not, set flag to create new record
      req.overwriteUserOtp = false;
    }

    next();
  } catch (error) {
    console.error("Validation Error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred during validation.",
    });
  }
};

module.exports = { validateRegisterInput };
