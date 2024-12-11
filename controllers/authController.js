const {
  insertUserOtp,
  updateUserOtp,
  getOtpRecord,
  deleteOtpRecord,
  findUserOtpById,
} = require("../models/userOtpModel");
const {
  encryptPassword,
  encryptSessionId,
  decryptSessionId,
} = require("../utils/encrypt");
const { generateSessionId, generateOTP } = require("../utils/generate");
const { updateAuthLogoutTime } = require("../models/authModel");
const { checkSessionExists, insertAuthRecord } = require("../models/authModel");
const { insertUser, getUserByUsername } = require("../models/userModel");
const nodemailer = require("nodemailer");
const { insertPermission } = require("../models/permissionModel");

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const otp = generateOTP();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for Registration",
      text: `Your OTP for registration is: ${otp}`,
    };

    transporter.sendMail(mailOptions, async (err) => {
      if (err) {
        console.error("Error sending OTP:", err);
        return res.status(500).json({
          status: "error",
          message: "Error sending OTP. Please try again later.",
        });
      }

      if (req.overwriteUserOtp) {
        await updateUserOtp(username, email, password, otp, "register");
      } else {
        await insertUserOtp(username, email, password, otp, "register");
      }

      res.status(200).json({
        status: "success",
        message: `OTP has been sent to ${email}`,
      });
    });
  } catch (error) {
    console.error("Error in registration:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred during registration. Please try again later.",
    });
  }
};

const verifyOTP = async (req, res) => {
  const { username, otp } = req.body;

  if (!username || !otp) {
    return res.status(400).json({
      status: "error",
      message: "Username and OTP are required",
    });
  }

  try {
    const rows = await getOtpRecord(username, otp, "register");
    if (rows.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid OTP or OTP has expired",
      });
    }

    const { email, password } = rows[0];
    const hashedPassword = await encryptPassword(password);

    await insertUser(username, hashedPassword, email);
    await insertPermission(username);

    await deleteOtpRecord(username);

    return res.status(200).json({
      status: "success",
      message: "OTP verified successfully, you may proceed with login.",
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while verifying OTP. Please try again later.",
    });
  }
};

const loginUser = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      status: "error",
      message: "Username and Password are required",
    });
  }

  try {
    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "User not found",
      });
    }

    if (user.password_hash !== (await encryptPassword(password))) {
      return res.status(400).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    const otp = generateOTP();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your OTP for Login",
      text: `Your OTP for login is: ${otp}`,
    };

    transporter.sendMail(mailOptions, async (err) => {
      if (err) {
        console.error("Error sending OTP:", err);
        return res.status(500).json({
          status: "error",
          message: "Error sending OTP. Please try again later.",
        });
      }

      const userOtpById = await findUserOtpById(username);
      if (userOtpById.length > 0) {
        await updateUserOtp(username, user.email, password, otp, "login");
      } else {
        await insertUserOtp(username, user.email, password, otp, "login");
      }
      res.status(200).json({
        status: "success",
        message: `OTP has been sent to ${user.email.substring(0, 3)}****@${
          user.email.split("@")[1]
        }`,
      });
    });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred during login. Please try again later.",
    });
  }
};

const verifyLoginOTP = async (req, res) => {
  const { username, otp } = req.body;

  if (!username || !otp) {
    return res.status(400).json({
      status: "error",
      message: "Username and OTP are required",
    });
  }

  try {
    const rows = await getOtpRecord(username, otp, "login");
    if (rows.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid OTP or OTP has expired",
      });
    }

    await deleteOtpRecord(username);

    const sessionId = generateSessionId();

    let isSessionIdUnique = await checkSessionExists(sessionId);
    while (isSessionIdUnique) {
      sessionId = generateSessionId();
      isSessionIdUnique = await checkSessionExists(sessionId);
    }

    await insertAuthRecord(sessionId, username);

    const encryptedSessionId = encryptSessionId(sessionId);

    res.cookie("session_id", encryptedSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 3600000,
    });

    return res.status(200).json({
      status: "success",
      message: "OTP verified successfully, redirecting to tasks",
      cookie: encryptedSessionId,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while verifying OTP. Please try again later.",
    });
  }
};

// Function to logout the user by updating the auth table
const logoutUser = async (req, res) => {
  const { cookie } = req.body; // Assuming the encrypted session_id is sent in the body as cookie

  try {
    if (!cookie) {
      return res.status(400).json({
        status: "error",
        message: "Session ID cookie is missing.",
      });
    }

    // Decrypt the session ID
    const sessionId = decryptSessionId(cookie);

    if (!sessionId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid session ID.",
      });
    }

    // Update the auth table to log out the user (set logout time and change status)
    const logoutTime = new Date(); // Get the current date and time
    await updateAuthLogoutTime(sessionId, logoutTime);

    // Send a successful response
    return res.status(200).json({
      status: "success",
      message: "User logged out successfully.",
    });
  } catch (error) {
    console.error("Error during logout:", error);
    return res.status(200).json({
      status: "error",
      message: "An error occurred during logout.",
    });
  }
};

module.exports = {
  registerUser,
  verifyOTP,
  loginUser,
  verifyLoginOTP,
  logoutUser,
};
