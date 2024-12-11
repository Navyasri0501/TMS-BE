const { decryptSessionId } = require("../utils/encrypt");
const { checkSession } = require("../models/authModel"); // Import the checkSession function

// Authentication middleware
const authenticate = async (req, res, next) => {
  const encryptedSessionId = req.body.cookie;

  // If no session cookie is found, return an error
  if (!encryptedSessionId) {
    return res.status(401).json({
      status: "error",
      message: "No session cookie found. Please log in first.",
    });
  }

  try {
    // Decrypt the session ID
    const sessionId = decryptSessionId(encryptedSessionId);

    // Check session validity by querying the database
    const rows = await checkSession(sessionId);

    // If no record is found, the session is not valid
    if (rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid session or session has expired.",
      });
    }

    // If the session is valid, attach user information to the request (optional)
    req.user = rows[0]; // You can pass user information from the auth table or users table if needed

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Error during authentication:", error);
    return res.status(500).json({
      status: "error",
      message:
        "An error occurred during authentication. Please try again later.",
    });
  }
};

module.exports = authenticate;
