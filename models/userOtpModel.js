const db = require("../config/db");

// Check if `userid` exists in `user_otp` table
const findUserOtpById = async (userid) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM user_otp WHERE user_id = ?";
    db.query(query, [userid], (err, results) => {
      if (err) reject(err);
      resolve(results);
    });
  });
};

// Insert a new entry into the `user_otp` table
const insertUserOtp = async (userid, email, password, otp, state) => {
  return new Promise((resolve, reject) => {
    const query =
      "INSERT INTO user_otp (user_id, email, password, otp, state) VALUES (?, ?, ?, ?,?)";
    db.query(query, [userid, email, password, otp, state], (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

// Update existing entry in the `user_otp` table
const updateUserOtp = async (userid, email, password, otp, state) => {
  return new Promise((resolve, reject) => {
    const query =
      "UPDATE user_otp SET email = ?, password = ?, otp = ?, state = ? WHERE user_id = ?";
    db.query(query, [email, password, otp, state, userid], (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

// Function to check if OTP exists for the given user_id and OTP value
const getOtpRecord = async (userid, otp, state) => {
  return new Promise((resolve, reject) => {
    const query =
      "SELECT * FROM user_otp WHERE user_id = ? AND otp = ? AND state = ?";
    db.query(query, [userid, otp, state], (err, results) => {
      if (err) reject(err);
      resolve([...results]);
    });
  });
};

// Function to update the state of OTP to 'verified'
const updateOtpState = async (username, otp) => {
  return new Promise((resolve, reject) => {
    db.execute(
      `UPDATE user_otp SET state = 'verified' WHERE user_id = ? AND otp = ?`,
      [username, otp]
    );
    resolve();
  });
};

// Function to delete the OTP record from the 'user_otp' table
const deleteOtpRecord = async (username) => {
  return new Promise((resolve, reject) => {
    db.execute(`DELETE FROM user_otp WHERE user_id = ?`, [username]);
    resolve();
  });
};

module.exports = {
  findUserOtpById,
  insertUserOtp,
  updateUserOtp,
  getOtpRecord,
  updateOtpState,
  deleteOtpRecord,
};
