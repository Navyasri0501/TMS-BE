const db = require("../config/db");

// Function to check if the session ID already exists in the auth table
const checkSessionExists = async (sessionId) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM auth WHERE session_id = ?";
    db.query(query, [sessionId], (err, results) => {
      if (err) reject(err);
      resolve(results.length > 0);
    });
  });
};

// Insert record into auth table
const insertAuthRecord = async (sessionId, username) => {
  const loginTime = new Date(); // Get current timestamp
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO auth (session_id, user_id, login_time, status) VALUES (?, ?, ?, ?)`;
    db.execute(
      query,
      [sessionId, username, loginTime, "Logged In"],
      (err, results) => {
        if (err) reject(err);
        resolve(results);
      }
    );
  });
};

// Check if a session is valid
const checkSession = async (sessionId) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM auth WHERE session_id = ? AND status = ?";
    db.query(query, [sessionId, "Logged In"], (err, results) => {
      if (err) reject(err);
      resolve(results);
    });
  });
};

// Function to update logout time and status in the auth table
const updateAuthLogoutTime = async (sessionId, logoutTime) => {
  return new Promise((resolve, reject) => {
    db.execute(
      `UPDATE auth SET logout_time = ?, status = "Logged Off" WHERE session_id = ?`,
      [logoutTime, sessionId]
    );
    resolve();
  });
};

const getUserIdBySessionId = (sessionId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT user_id 
      FROM auth 
      WHERE session_id = ? AND status = "Logged In"
    `;

    db.execute(query, [sessionId], (err, results) => {
      if (err) {
        reject(
          new Error("Error fetching user ID from auth table: " + err.message)
        );
      } else {
        // Check if results contain any rows and resolve with user_id or null
        resolve(results.length > 0 ? results[0].user_id : null);
      }
    });
  });
};

// Function to delete auth records by user ID
const deleteAuthRecordsByUserId = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      DELETE FROM auth 
      WHERE user_id = ?
    `;
    db.execute(query, [userId], (err, results) => {
      if (err) {
        reject(new Error("Error deleting auth records: " + err.message));
      } else {
        resolve(results);
      }
    });
  });
};

module.exports = {
  checkSessionExists,
  insertAuthRecord,
  checkSession,
  updateAuthLogoutTime,
  getUserIdBySessionId,
  deleteAuthRecordsByUserId,
};
