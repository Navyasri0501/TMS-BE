const crypto = require("crypto");

const generateTaskId = () => {
  return crypto.randomBytes(8).toString("hex");
};

const generateOTP = () => {
  return String(Math.floor(100000 + Math.random() * 900000)).padStart(6, "0");
};

// Helper function to generate random session_id (16 characters)
const generateSessionId = () => {
  return crypto.randomBytes(8).toString("hex"); // Generate 16-character session ID
};

module.exports = {
  generateOTP,
  generateSessionId,
  generateTaskId,
};
