const db = require("../config/db");

// Check if `userid` exists in `users` table
const findUserById = async (userid) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM users WHERE user_id = ?";
    db.query(query, [userid], (err, results) => {
      if (err) reject(err);
      resolve(results);
    });
  });
};

// Check if `email` exists in `users` table
const findUserByEmail = async (email) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM users WHERE email = ?";
    db.query(query, [email], (err, results) => {
      if (err) reject(err);
      resolve(results);
    });
  });
};

// Function to insert a new user into the 'users' table
const insertUser = async (username, hashedPassword, email) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO users (user_id, email, password_hash, name, type, role, power) 
      VALUES (?, ?, ?, ?, 'User', 'New User', 100000)`;
    db.execute(
      query,
      [username, email, hashedPassword, username],
      (err, results) => {
        if (err) reject(err);
        resolve(results);
      }
    );
  });
};

// Function to get user details by username
const getUserByUsername = async (username) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM users WHERE user_id = ?";
    db.query(query, [username], (err, results) => {
      if (err) reject(err);
      if (results.length > 0) {
        resolve(results[0]);
      } else {
        resolve(null);
      }
    });
  });
};

// Function to get user details by user_id from the users table
const getUserDetailsById = async (userId) => {
  try {
    const query = `
      SELECT user_id, name, email, role 
      FROM users 
      WHERE user_id = ?
    `;
    const [rows] = await db.promise().query(query, [userId]);

    // Return user details if found, otherwise null
    return rows.length > 0 ? rows : null;
  } catch (error) {
    throw new Error(
      "Error fetching user details from users table: " + error.message
    );
  }
};

// Function to update the name of a user in the users table
const updateUserName = (userId, newName) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE users 
      SET name = ? 
      WHERE user_id = ?
    `;
    db.execute(query, [newName, userId], (err, results) => {
      if (err) {
        reject(new Error("Error updating user name: " + err.message));
      } else {
        resolve(results);
      }
    });
  });
};

const updateUserEmail = (userId, newEmail) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE users 
      SET email = ? 
      WHERE user_id = ?
    `;
    db.execute(query, [newEmail, userId], (err, results) => {
      if (err) {
        reject(new Error("Error updating user email: " + err.message));
      } else {
        resolve(results);
      }
    });
  });
};

// Function to update user password in the users table
const updateUserPassword = (userId, hashedPassword) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE users 
      SET password_hash = ? 
      WHERE user_id = ?
    `;
    db.execute(query, [hashedPassword, userId], (err, results) => {
      if (err) {
        reject(new Error("Error updating user password: " + err.message));
      } else {
        resolve(results);
      }
    });
  });
};

const searchUsersByQuery = (searchQuery) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT user_id, name 
      FROM users 
      WHERE user_id LIKE ? OR name LIKE ?
    `;
    const likeQuery = `%${searchQuery}%`;

    db.execute(query, [likeQuery, likeQuery], (err, results) => {
      if (err) {
        reject(new Error("Error searching users: " + err.message));
      } else {
        resolve(results);
      }
    });
  });
};

const getUserFullDetailsById = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT user_id, name, power, role, email 
      FROM users 
      WHERE user_id = ?
    `;
    db.execute(query, [userId], (err, results) => {
      if (err) {
        reject(
          new Error(
            "Error fetching user details from users table: " + err.message
          )
        );
      } else {
        resolve(results.length > 0 ? results[0] : null);
      }
    });
  });
};

const updateUserDetails = (userId, { name, power, role }) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE users 
      SET name = ?, power = ?, role = ? 
      WHERE user_id = ?
    `;
    db.execute(query, [name, power, role, userId], (err, results) => {
      if (err) {
        reject(new Error("Error updating user details: " + err.message));
      } else {
        resolve(results);
      }
    });
  });
};

// Function to delete a user by user ID
const deleteUserById = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      DELETE FROM users 
      WHERE user_id = ?
    `;
    db.execute(query, [userId], (err, results) => {
      if (err) {
        reject(new Error("Error deleting user: " + err.message));
      } else {
        resolve(results);
      }
    });
  });
};

module.exports = {
  findUserById,
  findUserByEmail,
  insertUser,
  getUserByUsername,
  getUserDetailsById,
  updateUserName,
  updateUserEmail,
  updateUserPassword,
  searchUsersByQuery,
  getUserFullDetailsById,
  updateUserDetails,
  deleteUserById,
};
