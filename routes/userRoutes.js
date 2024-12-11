const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate"); // Assuming the middleware is in 'middlewares/authenticate.js'
const {
  getUserData,
  renameUser,
  emailChange,
  verifyEmailOTP,
  passwordChange,
  verifyPasswordOTP,
  searchUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
// Example route
router.post("/getUser", authenticate, getUserData);

router.post("/renameUser", authenticate, renameUser);

router.post("/emailChange", authenticate, emailChange);

router.post("/verifyEmailOTP", authenticate, verifyEmailOTP);

router.post("/passwordChange", authenticate, passwordChange);

router.post("/verifyPasswordOTP", authenticate, verifyPasswordOTP);

router.post("/searchUsers", authenticate, searchUsers);

router.post("/getUserbyId", authenticate, getUserById);

router.post("/updateUser", authenticate, updateUser);

router.post("/deleteUser", authenticate, deleteUser);

module.exports = router; // Export the router
