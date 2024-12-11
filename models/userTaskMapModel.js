const db = require("../config/db");

// Function to insert multiple records into user_task_map
const insertUserTaskMap = async (taskId, user_id) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO user_task_map (user_id, task_id) VALUES (?, ?)`;
    db.execute(query, [user_id, taskId], (err, results) => {
      if (err) reject(err);
      resolve(results);
    });
  });
};

// Fetch task IDs from user_task_map for a given user_id
const getUserTasks = async (userId) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT task_id FROM user_task_map WHERE user_id = ?";
    db.execute(query, [userId], (err, result) => {
      if (err) {
        return reject(err);
      }
      const taskIds = result.map((row) => row.task_id);
      resolve(taskIds);
    });
  });
};

module.exports = { insertUserTaskMap, getUserTasks };
