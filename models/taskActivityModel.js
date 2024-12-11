const db = require("../config/db");

// Function to insert a record into task_activity table
const insertTaskActivity = async (
  taskId,
  markedStatus,
  timestamp,
  userId,
  comment
) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO task_activity (task_id, marked_status, activity_time_stamp, user_id, comments) VALUES (?, ?, ?, ?, ?)`;
    db.execute(
      query,
      [taskId, markedStatus, timestamp, userId, comment],
      (err, results) => {
        if (err) reject(err);
        resolve(results);
      }
    );
  });
};

// Fetch the most recent activity record from the task_activity table for a given task_id
const getMostRecentTaskActivity = async (taskId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM task_activity 
      WHERE task_id = ?
      ORDER BY activity_time_stamp DESC
      LIMIT 1
    `;
    db.execute(query, [taskId], (err, result) => {
      if (err) {
        return reject(err);
      }
      if (result.length > 0) {
        resolve(result[0]);
      } else {
        resolve(null);
      }
    });
  });
};

// Get task activity records from the task_activity table based on task_id, ordered by activity_time_stamp
const getTaskActivityById = async (taskId) => {
  return new Promise((resolve, reject) => {
    const query = `
     SELECT * FROM task_activity WHERE task_id = ? ORDER BY activity_time_stamp DESC
    `;
    db.execute(query, [taskId], (err, result) => {
      if (err) {
        return reject(err);
      }
      if (result.length > 0) {
        resolve(result);
      } else {
        resolve(null);
      }
    });
  });
};

// Delete task from task_activity table
const deleteTaskFromActivity = async (task_id) => {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM task_activity WHERE task_id = ?`;
    db.execute(query, [task_id], (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

module.exports = {
  insertTaskActivity,
  getMostRecentTaskActivity,
  getTaskActivityById,
  deleteTaskFromActivity,
};
