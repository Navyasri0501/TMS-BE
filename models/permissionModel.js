const db = require("../config/db");

// Function to insert a record into the permissions table
const insertPermission = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO permissions (user_id, edit_user, delete_user, create_task, edit_task, delete_task, edit_task_state)
      VALUES (?, 0,0,0,0,0,0)
    `;

    const values = [userId];

    db.execute(query, values, (err, results) => {
      if (err) {
        reject(
          new Error(
            "Error inserting record into permissions table: " + err.message
          )
        );
      } else {
        resolve(results);
      }
    });
  });
};

const getPermissionsByUserId = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT edit_user, delete_user, create_task, edit_task, delete_task, edit_task_state 
      FROM permissions 
      WHERE user_id = ?
    `;
    db.execute(query, [userId], (err, results) => {
      if (err) {
        reject(
          new Error(
            "Error fetching permissions from permissions table: " + err.message
          )
        );
      } else {
        resolve(results.length > 0 ? results[0] : null);
      }
    });
  });
};

const getUserPermissions = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT edit_user 
      FROM permissions 
      WHERE user_id = ?
    `;
    db.execute(query, [userId], (err, results) => {
      if (err) {
        reject(new Error("Error fetching user permissions: " + err.message));
      } else {
        resolve(results.length > 0 ? results[0] : null);
      }
    });
  });
};

// Function to update permissions in the permissions table
const updateUserPermissions = (userId, permissions) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE permissions 
      SET edit_user = ?, delete_user = ?, create_task = ?, edit_task = ?, delete_task = ?, edit_task_state = ? 
      WHERE user_id = ?
    `;

    const values = [
      permissions.edit_user || 0,
      permissions.delete_user || 0,
      permissions.create_task || 0,
      permissions.edit_task || 0,
      permissions.delete_task || 0,
      permissions.edit_task_state || 0,
      userId,
    ];

    db.execute(query, values, (err, results) => {
      if (err) {
        reject(new Error("Error updating user permissions: " + err.message));
      } else {
        resolve(results);
      }
    });
  });
};

// Function to get user permissions by user ID
const getUserFullPermissions = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * 
      FROM permissions 
      WHERE user_id = ?
    `;
    db.execute(query, [userId], (err, results) => {
      if (err) {
        reject(new Error("Error fetching permissions: " + err.message));
      } else {
        resolve(results.length > 0 ? results[0] : null);
      }
    });
  });
};

// Function to delete permissions by user ID
const deletePermissionsByUserId = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      DELETE FROM permissions 
      WHERE user_id = ?
    `;
    db.execute(query, [userId], (err, results) => {
      if (err) {
        reject(new Error("Error deleting permissions: " + err.message));
      } else {
        resolve(results);
      }
    });
  });
};

module.exports = {
  insertPermission,
  getPermissionsByUserId,
  getUserPermissions,
  updateUserPermissions,
  getUserFullPermissions,
  deletePermissionsByUserId,
};
