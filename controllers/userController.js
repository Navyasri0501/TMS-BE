const { decryptSessionId, encryptPassword } = require("../utils/encrypt"); // For decrypting the session_id
const { getUserIdBySessionId } = require("../models/authModel"); // Database operation to fetch user_id
const {
  getUserDetailsById,
  getUserFullDetailsById,
  updateUserName,
  updateUserEmail,
  updateUserPassword,
  searchUsersByQuery,
  updateUserDetails,
  deleteUserById,
} = require("../models/userModel"); // Database operation to fetch user details
const {
  insertUserOtp,
  deleteOtpRecord,
  getOtpRecord,
  findUserOtpById,
  updateUserOtp,
} = require("../models/userOtpModel");
const {
  getPermissionsByUserId,
  getUserPermissions,
  updateUserPermissions,
  getUserFullPermissions,
  deletePermissionsByUserId,
} = require("../models/permissionModel");
const { deleteAuthRecordsByUserId } = require("../models/authModel");
const { generateOTP } = require("../utils/generate");

const nodemailer = require("nodemailer");
const MAX_NAME_LENGTH = 45; // Match the database constraint for the name column

// Controller function to get user data
const getUserData = async (req, res) => {
  const { cookie } = req.body; // Encrypted session ID passed in the body

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

    // Get the user_id from the auth table
    const userId = await getUserIdBySessionId(sessionId);

    if (!userId) {
      return res.status(404).json({
        status: "error",
        message: "No user found for the given session ID.",
      });
    }

    // Get user details from the users table
    const userDetails = await getUserFullDetailsById(userId);
    if (!userDetails) {
      return res.status(404).json({
        status: "error",
        message: "User not found in the database.",
      });
    }

    // Fetch user permissions from the permissions table
    const userPermissions = await getPermissionsByUserId(userId);

    if (!userPermissions) {
      return res.status(404).json({
        status: "error",
        message: "Permissions not found for the user.",
      });
    }

    // Combine user details and permissions into a single object
    const user = {
      ...userDetails,
      permissions: userPermissions,
    };

    // Send the user data as response
    return res.status(200).json({
      status: "success",
      user: user,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching user data.",
    });
  }
};

// Function to rename a user
const renameUser = async (req, res) => {
  const { cookie, newName } = req.body;

  try {
    if (!cookie) {
      return res.status(400).json({
        status: "error",
        message: "Cookie is missing.",
      });
    }

    if (!newName || typeof newName !== "string" || newName.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Invalid new name provided.",
      });
    }

    if (newName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({
        status: "error",
        message: `Name cannot exceed ${MAX_NAME_LENGTH} characters.`,
      });
    }

    // Decrypt the session ID from the cookie
    const sessionId = decryptSessionId(cookie);

    if (!sessionId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid session ID.",
      });
    }

    // Fetch the user ID from the auth table using the session ID
    const userId = await getUserIdBySessionId(sessionId);

    if (!userId) {
      return res.status(404).json({
        status: "error",
        message: "User not found for the given session ID.",
      });
    }

    // Update the user's name in the users table
    const result = await updateUserName(userId, newName);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Failed to update the name. User may not exist.",
      });
    }

    // Send success response
    return res.status(200).json({
      status: "success",
      message: "Name updated successfully.",
    });
  } catch (error) {
    console.error("Error renaming user:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while renaming the user.",
    });
  }
};

const emailChange = async (req, res) => {
  const { cookie, newEmail } = req.body;

  try {
    // Validate the email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email format.",
      });
    }

    // Decrypt the session ID from the cookie
    const sessionId = decryptSessionId(cookie);

    if (!sessionId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid session ID.",
      });
    }

    // Fetch the user ID from the auth table using the session ID
    const userId = await getUserIdBySessionId(sessionId);

    if (!userId) {
      return res.status(404).json({
        status: "error",
        message: "User not found for the given session ID.",
      });
    }

    // Fetch the user's current email from the users table
    const userDetails = await getUserDetailsById(userId);

    if (!userDetails) {
      return res.status(404).json({
        status: "error",
        message: "User details not found in the database.",
      });
    }

    const { email } = userDetails[0];

    // Generate OTP
    const otp = generateOTP();

    // Send OTP to the new email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: newEmail,
      subject: "Your OTP for Email Change",
      text: `Your OTP for email change is: ${otp}`,
    };

    transporter.sendMail(mailOptions, async (err) => {
      if (err) {
        console.error("Error sending OTP:", err);
        return res.status(500).json({
          status: "error",
          message: "Error sending OTP. Please try again later.",
        });
      }

      // Insert a record in user_otp table
      const randomPassword = Math.random().toString(36).slice(-10); // Generate a random password of 10 characters

      const userOtpById = await findUserOtpById(userId);
      if (userOtpById.length > 0) {
        // If exists, set flag to overwrite data
        // Overwrite existing record
        await updateUserOtp(
          userId,
          newEmail,
          randomPassword,
          otp,
          "Email Change"
        );
      } else {
        // If not, set flag to create new record
        // Insert new record
        await insertUserOtp(
          userId,
          newEmail,
          randomPassword,
          otp,
          "Email Change"
        );
      }

      // await insertUserOtp(
      //   userId,
      //   newEmail,
      //   randomPassword,
      //   otp,
      //   "Email Change"
      // );

      // Send success response
      return res.status(200).json({
        status: "success",
        message: `OTP has been sent to ${newEmail}`,
      });
    });
  } catch (error) {
    console.error("Error during email change:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while processing the email change request.",
    });
  }
};

const verifyEmailOTP = async (req, res) => {
  const { cookie, otp } = req.body;

  try {
    if (!cookie) {
      return res.status(400).json({
        status: "error",
        message: "Cookie is missing.",
      });
    }

    if (!otp || otp.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "OTP is required.",
      });
    }

    // Decrypt the session ID from the cookie
    const sessionId = decryptSessionId(cookie);

    if (!sessionId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid session ID.",
      });
    }

    // Fetch the user ID from the auth table using the session ID
    const userId = await getUserIdBySessionId(sessionId);

    if (!userId) {
      return res.status(404).json({
        status: "error",
        message: "User not found for the given session ID.",
      });
    }

    // Verify the OTP in the user_otp table
    const otpRecords = await getOtpRecord(userId, otp, "Email Change");

    if (otpRecords.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP.",
      });
    }

    // Fetch the new email from the OTP record
    const { email: newEmail } = otpRecords[0];

    // Update the email in the users table
    await updateUserEmail(userId, newEmail);

    // Remove the OTP record from the user_otp table
    await deleteOtpRecord(userId);

    // Send success response
    return res.status(200).json({
      status: "success",
      message: "Email changed successfully.",
    });
  } catch (error) {
    console.error("Error verifying email OTP:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while verifying the email OTP.",
    });
  }
};

const passwordChange = async (req, res) => {
  const { cookie, currentPassword, newPassword, confirmPassword } = req.body;

  try {
    // Validate input fields
    if (!cookie) {
      return res.status(400).json({
        status: "error",
        message: "Cookie is missing.",
      });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: "error",
        message: "All password fields are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: "error",
        message: "New password and confirm password do not match.",
      });
    }

    if (newPassword.length < 8 || newPassword.length > 36) {
      return res.status(400).json({
        status: "error",
        message: "Password must be between 8 and 36 characters long.",
      });
    }

    // Decrypt the session ID from the cookie
    const sessionId = decryptSessionId(cookie);

    if (!sessionId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid session ID.",
      });
    }

    // Fetch the user ID from the auth table using the session ID
    const userId = await getUserIdBySessionId(sessionId);

    if (!userId) {
      return res.status(404).json({
        status: "error",
        message: "User not found for the given session ID.",
      });
    }

    // Fetch user details from the users table
    const userDetails = await getUserDetailsById(userId);

    if (!userDetails) {
      return res.status(404).json({
        status: "error",
        message: "User details not found in the database.",
      });
    }

    const { email } = userDetails[0];

    // Masked email for response
    const maskedEmail =
      email.substring(0, 2) + "****" + email.substring(email.indexOf("@"));

    // Generate OTP
    const otp = generateOTP();

    const userOtpById = await findUserOtpById(userId);
    if (userOtpById.length > 0) {
      // If exists, set flag to overwrite data
      // Overwrite existing record
      await updateUserOtp(
        userId,
        "random@example.com",
        newPassword,
        otp,
        "Password Change"
      );
    } else {
      // If not, set flag to create new record
      // Insert new record
      await insertUserOtp(
        userId,
        "random@example.com",
        newPassword,
        otp,
        "Password Change"
      );
    }

    // // Insert a record in user_otp table
    // await insertUserOtp(
    //   userId,
    //   "random@example.com", // Random email as per requirements
    //   newPassword,
    //   otp,
    //   "Password Change"
    // );

    // Send OTP to user's email
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
      subject: "Your OTP for Password Change",
      text: `Your OTP for password change is: ${otp}`,
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error("Error sending OTP:", err);
        return res.status(500).json({
          status: "error",
          message: "Error sending OTP. Please try again later.",
        });
      }

      // Send success response
      return res.status(200).json({
        status: "success",
        message: `An OTP has been sent to ${maskedEmail}`,
      });
    });
  } catch (error) {
    console.error("Error during password change:", error);
    return res.status(500).json({
      status: "error",
      message:
        "An error occurred while processing the password change request.",
    });
  }
};

// Function to verify password change OTP
const verifyPasswordOTP = async (req, res) => {
  const { cookie, otp } = req.body;

  try {
    if (!cookie) {
      return res.status(400).json({
        status: "error",
        message: "Cookie is missing.",
      });
    }

    if (!otp || otp.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "OTP is required.",
      });
    }

    // Decrypt the session ID from the cookie
    const sessionId = decryptSessionId(cookie);

    if (!sessionId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid session ID.",
      });
    }

    // Fetch the user ID from the auth table using the session ID
    const userId = await getUserIdBySessionId(sessionId);

    if (!userId) {
      return res.status(404).json({
        status: "error",
        message: "User not found for the given session ID.",
      });
    }

    // Fetch the record from user_otp table
    const otpRecord = await getOtpRecord(userId, otp, "Password Change");
    if (!otpRecord) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP.",
      });
    }

    // Encrypt the new password
    const hashedPassword = await encryptPassword(otpRecord[0].password);

    // Update the user's password in the users table
    await updateUserPassword(userId, hashedPassword);

    // Remove the OTP record from the user_otp table
    await deleteOtpRecord(userId);

    // Send success response
    return res.status(200).json({
      status: "success",
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.error("Error verifying password OTP:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while verifying the OTP.",
    });
  }
};

const searchUsers = async (req, res) => {
  const { search } = req.body;

  try {
    if (!search || search.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Search query is required.",
      });
    }

    // Perform search using the search query
    const users = await searchUsersByQuery(search);

    // Send success response with users data
    return res.status(200).json({
      status: "success",
      users: users,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while searching for users.",
    });
  }
};

const getUserById = async (req, res) => {
  const { user_id } = req.body;

  try {
    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "User ID is required.",
      });
    }

    // Fetch user details from the users table
    const userDetails = await getUserFullDetailsById(user_id);

    if (!userDetails) {
      return res.status(404).json({
        status: "error",
        message: "User not found.",
      });
    }

    // Fetch user permissions from the permissions table
    const userPermissions = await getPermissionsByUserId(user_id);

    if (!userPermissions) {
      return res.status(404).json({
        status: "error",
        message: "Permissions not found for the user.",
      });
    }

    // Combine user details and permissions into a single object
    const user = {
      ...userDetails,
      permissions: userPermissions,
    };

    // Send success response with user data
    return res.status(200).json({
      status: "success",
      user: user,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching user details.",
    });
  }
};

const updateUser = async (req, res) => {
  const { cookie, targetUser } = req.body;

  try {
    if (!cookie) {
      return res.status(400).json({
        status: "error",
        message: "Cookie is missing.",
      });
    }

    if (!targetUser || !targetUser.user_id) {
      return res.status(400).json({
        status: "error",
        message: "Target user data is required.",
      });
    }

    // Decrypt the session ID from the cookie
    const sessionId = decryptSessionId(cookie);

    if (!sessionId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid session ID.",
      });
    }

    // Fetch the user ID from the auth table using the session ID
    const userId = await getUserIdBySessionId(sessionId);

    if (!userId) {
      return res.status(404).json({
        status: "error",
        message: "User not found for the given session ID.",
      });
    }

    if (userId === targetUser.user_id) {
      return res.status(403).json({
        status: "error",
        message:
          "You are not allowed to change your own permissions or role details",
      });
    }

    // Check if the user has `edit_user` permission
    const permissions = await getUserPermissions(userId);

    if (!permissions || permissions.edit_user !== 1) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to edit user details.",
      });
    }

    const currentUserDetails = await getUserFullDetailsById(userId);
    const targetUserDetails = await getUserFullDetailsById(targetUser.user_id);
    if (currentUserDetails && targetUserDetails) {
      if (currentUserDetails.power > targetUserDetails.power) {
        return res.status(403).json({
          status: "error",
          message: "You didn't have required power to update this user",
        });
      }
      if (currentUserDetails.power > targetUser.power) {
        return res.status(403).json({
          status: "error",
          message:
            "You are not allowed to assign power to another user lessthan your's",
        });
      }
    } else {
      return res.status(403).json({
        status: "error",
        message: "Invalid user_id or target user_id",
      });
    }

    // Update user details in the users table
    const {
      user_id: targetUserId,
      name,
      power,
      role,
      permissions: newPermissions,
    } = targetUser;

    const userUpdateResult = await updateUserDetails(targetUserId, {
      name,
      power,
      role,
    });

    if (userUpdateResult.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Target user not found in the users table.",
      });
    }

    // Update permissions in the permissions table
    const permissionUpdateResult = await updateUserPermissions(
      targetUserId,
      newPermissions
    );

    if (permissionUpdateResult.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Target user not found in the permissions table.",
      });
    }

    // Send success response
    return res.status(200).json({
      status: "success",
      message: "User details and permissions updated successfully.",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while updating user details.",
    });
  }
};

// Function to delete a user
const deleteUser = async (req, res) => {
  const { cookie, targetUser } = req.body;

  try {
    if (!cookie) {
      return res.status(400).json({
        status: "error",
        message: "Cookie is missing.",
      });
    }

    if (!targetUser) {
      return res.status(400).json({
        status: "error",
        message: "Target user ID is required.",
      });
    }

    // Decrypt the session ID from the cookie
    const sessionId = decryptSessionId(cookie);

    if (!sessionId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid session ID.",
      });
    }

    // Fetch the user ID from the auth table using the session ID
    const userId = await getUserIdBySessionId(sessionId);

    if (!userId) {
      return res.status(404).json({
        status: "error",
        message: "User not found for the given session ID.",
      });
    }

    if (targetUser === userId) {
      return res.status(403).json({
        status: "error",
        message: "You are not allowed to delete your self",
      });
    }

    // Fetch permissions and details of both the current user and target user
    const userPermissions = await getUserFullPermissions(userId);
    const currentUserDetails = await getUserFullDetailsById(userId);
    const targetUserDetails = await getUserFullDetailsById(targetUser);

    if (!currentUserDetails || !targetUserDetails) {
      return res.status(404).json({
        status: "error",
        message: "Target user or current user not found.",
      });
    }

    // Check if the current user has delete_user permission
    if (!userPermissions || userPermissions.delete_user !== 1) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to delete users.",
      });
    }

    console.log(currentUserDetails.power, targetUserDetails.power);
    // Check if the current user has enough power to delete the target user
    if (currentUserDetails.power > targetUserDetails.power) {
      return res.status(403).json({
        status: "error",
        message: "You don't have enough power to delete this user.",
      });
    }

    // Delete records from users, auth, and permissions tables
    await deletePermissionsByUserId(targetUser);
    await deleteAuthRecordsByUserId(targetUser);
    await deleteUserById(targetUser);

    // Send success response
    return res.status(200).json({
      status: "success",
      message: `User with ID ${targetUser} deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the user.",
    });
  }
};

module.exports = {
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
};
