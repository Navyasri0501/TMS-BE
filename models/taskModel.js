const db = require("../config/db");

const checkTaskIdExists = async (task_id) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM tasks WHERE task_id = ?";
    db.query(query, [task_id], (err, results) => {
      if (err) reject(err);
      resolve(results.length > 0);
    });
  });
};

// Function to insert a task into the tasks table
const insertTask = async (
  taskId,
  title,
  description,
  assigned_date,
  dueDate,
  priority,
  assignedById
) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO tasks (task_id, title, description, assigned_date, due_date, priority, assigned_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.execute(
      query,
      [
        taskId,
        title,
        description,
        assigned_date,
        dueDate,
        priority,
        assignedById,
      ],
      (err, results) => {
        if (err) reject(err);
        resolve(results);
      }
    );
  });
};

// Fetch task details from the tasks table for a given task_id
const getTaskDetails = async (taskId) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM tasks WHERE task_id = ?";
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

// Fetch task IDs from user_task_map for a given user_id
const getUserCreatedTasks = async (userId) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT task_id FROM tasks WHERE assigned_by_user_id = ?";
    db.execute(query, [userId], (err, result) => {
      if (err) {
        return reject(err);
      }
      const taskIds = result.map((row) => row.task_id);
      resolve(taskIds);
    });
  });
};

// Function to update task details
const updateTaskDetails = async (
  task_id,
  title,
  description,
  priority,
  due_date
) => {
  return new Promise((resolve, reject) => {
    const query = `UPDATE tasks SET title = ?, description = ?, priority = ?, due_date = ? WHERE task_id = ?`;
    db.execute(
      query,
      [title, description, priority, due_date, task_id],
      (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      }
    );
  });
};

// Delete task from tasks table
const deleteTaskFromTasks = async (task_id) => {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM tasks WHERE task_id = ?`;
    db.execute(query, [task_id], (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

module.exports = {
  checkTaskIdExists,
  insertTask,
  getTaskDetails,
  getUserCreatedTasks,
  updateTaskDetails,
  deleteTaskFromTasks,
};
