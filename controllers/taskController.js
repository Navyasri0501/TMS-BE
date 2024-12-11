const { decryptSessionId } = require("../utils/encrypt");
const { getUserIdBySessionId } = require("../models/authModel");
const {
  insertTaskActivity,
  getMostRecentTaskActivity,
  getTaskActivityById,
  deleteTaskFromActivity,
} = require("../models/taskActivityModel");
const {
  insertUserTaskMap,
  getUserTasks,
} = require("../models/userTaskMapModel");
const {
  checkTaskIdExists,
  insertTask,
  getTaskDetails,
  getUserCreatedTasks,
  updateTaskDetails,
  deleteTaskFromTasks,
} = require("../models/taskModel");
const { findUserById } = require("../models/userModel");
const { generateTaskId } = require("../utils/generate"); // Assuming you have the unique task_id generator
const { getUserFullPermissions } = require("../models/permissionModel");

const createTask = async (req, res) => {
  const { cookie, title, description, priority, due_date, userId } = req.body;

  try {
    // Step 1: Decrypt session_id from cookie and get user_id
    const sessionId = decryptSessionId(cookie);
    const userIdFromSession = await getUserIdBySessionId(sessionId);

    if (!userIdFromSession) {
      return res
        .status(400)
        .json({ message: "Invalid session or user not found." });
    }

    // Step 2: Validate data in the request body (example: validate priority, due_date, etc.)
    if (!title || !description || !priority || !due_date || !userId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Step 4: Split and validate userId(s) to assign tasks
    const assignedUsers = userId
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "" && id !== null);

    // Step 5: Get the user's permissions from the permissions table
    const permissions = await getUserFullPermissions(userIdFromSession);
    if (!permissions || permissions.edit_task_state !== 1) {
      return res.status(403).json({
        message: "You do not have permission to create a Task.",
      });
    }

    // Step 5: Validate all assigned users
    const invalidUsers = [];
    for (let assignedUserId of assignedUsers) {
      const rows = await findUserById(assignedUserId);
      if (rows.length === 0) {
        invalidUsers.push(assignedUserId);
      }
    }

    if (invalidUsers.length > 0) {
      return res
        .status(400)
        .json({ message: `Invalid users: ${invalidUsers.join(", ")}` });
    }

    // Step 3: Generate unique task_id
    let isTaskIdUnique = false;
    let taskId = generateTaskId();
    isTaskIdUnique = await checkTaskIdExists(taskId);
    // Check if task_id already exists, if so, generate again
    while (isTaskIdUnique) {
      taskId = generateTaskId();
      isTaskIdUnique = await checkTaskIdExists(taskId);
    }

    let curDate = new Date();

    // Step 6: Insert task, task activity, and user_task_map records
    await insertTask(
      taskId,
      title,
      description,
      curDate,
      due_date,
      priority,
      userIdFromSession
    );
    await insertTaskActivity(
      taskId,
      "Created",
      curDate,
      userIdFromSession,
      "Assigned"
    );
    for (let user_id_into_map of assignedUsers) {
      await insertUserTaskMap(taskId, user_id_into_map);
    }

    // Step 7: Send success response
    res.status(200).json({ message: "Task created successfully", taskId });
  } catch (error) {
    console.error("Error creating task:", error);
    res
      .status(500)
      .json({ message: "Error creating task", error: error.message });
  }
};

const getTasks = async (req, res) => {
  try {
    // Step 1: Decrypt session ID from the cookie
    const sessionId = req.body.cookie; // Assuming session_id is sent in body as cookie.
    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const decryptedSessionId = decryptSessionId(sessionId); // Decrypting session_id
    if (!decryptedSessionId) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    // Step 2: Get the user_id corresponding to the session_id
    const userId = await getUserIdBySessionId(decryptedSessionId);
    if (!userId) {
      return res
        .status(404)
        .json({ message: "User not found or session expired" });
    }

    // Step 3: Fetch all task_ids assigned to the user
    const taskIds = await getUserTasks(userId);
    if (!taskIds.length) {
      return res.status(404).json({ message: "No tasks found for this user" });
    }

    // Step 4: Traverse each task_id to fetch task details and most recent task activity
    const tasks = [];
    for (const taskId of taskIds) {
      const taskDetails = await getTaskDetails(taskId);
      if (!taskDetails) {
        continue; // Skip this task if no details are found
      }

      const mostRecentActivity = await getMostRecentTaskActivity(taskId);
      tasks.push({
        task_id: taskDetails.task_id,
        title: taskDetails.title,
        description: taskDetails.description,
        assigned_date: taskDetails.assigned_date,
        due_date: taskDetails.due_date,
        priority: taskDetails.priority,
        assigned_by_user_id: taskDetails.assigned_by_user_id,
        recent_log: mostRecentActivity
          ? {
              marked_status: mostRecentActivity.marked_status,
              activity_time_stamp: mostRecentActivity.activity_time_stamp,
              user_id: mostRecentActivity.user_id,
              comments: mostRecentActivity.comments,
            }
          : null,
      });
    }

    // Step 5: Return the list of tasks
    return res.status(200).json({ tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res
      .status(500)
      .json({ message: "Server error while fetching tasks" });
  }
};

const getTaskById = async (req, res) => {
  try {
    // Step 1: Decrypt the session ID from the body (cookie)
    const sessionId = req.body.cookie; // Assuming session_id is sent in the body as cookie.
    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const decryptedSessionId = decryptSessionId(sessionId);
    if (!decryptedSessionId) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    // Step 2: Get the user_id corresponding to the session_id
    const userId = await getUserIdBySessionId(decryptedSessionId);
    if (!userId) {
      return res
        .status(404)
        .json({ message: "User not found or session expired" });
    }

    // Step 3: Get task_id from the body and check if the task exists
    const { task_id } = req.body;
    if (!task_id) {
      return res.status(400).json({ message: "Task ID is required" });
    }

    // Step 4: Fetch task details from tasks table using the task_id
    const taskDetails = await getTaskDetails(task_id);
    if (!taskDetails) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Step 5: Fetch task activities for the task ordered by activity_time_stamp
    const taskActivities = await getTaskActivityById(task_id);

    // Step 6: Send the response with task details and task activities
    return res.status(200).json({
      task: {
        task_id: taskDetails.task_id,
        title: taskDetails.title,
        description: taskDetails.description,
        assigned_date: taskDetails.assigned_date,
        due_date: taskDetails.due_date,
        priority: taskDetails.priority,
        assigned_by_user_id: taskDetails.assigned_by_user_id,
        logs: taskActivities,
      },
    });
  } catch (error) {
    console.error("Error getting task:", error);
    return res.status(500).json({ message: "Error retrieving task details" });
  }
};

const updateTaskState = async (req, res) => {
  try {
    // Step 1: Get the session_id and decrypt it
    const { cookie, task_id, marked_status, comment } = req.body;

    const decryptedSessionId = decryptSessionId(cookie); // Decrypting session_id
    if (!decryptedSessionId) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    // Step 2: Get the user_id corresponding to the session_id
    const user_id = await getUserIdBySessionId(decryptedSessionId);
    if (!user_id) {
      return res
        .status(404)
        .json({ message: "User not found or session expired" });
    }
    // Step 3: Check if the task exists in the tasks table
    const taskExists = await checkTaskIdExists(task_id);
    if (!taskExists) {
      return res.status(404).json({ message: "Task not found." });
    }

    // Step 4: Check if the user exists and has edit_task_state permission
    const userExists = await findUserById(user_id);
    if (userExists.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    // Step 5: Get the user's permissions from the permissions table
    const permissions = await getUserFullPermissions(user_id);
    if (!permissions || permissions.edit_task_state !== 1) {
      return res.status(403).json({
        message: "You do not have permission to update the task state.",
      });
    }

    // Step 6: Insert the task state update into the task_activity table
    const activityTimeStamp = new Date(); // Current datetime stamp

    const result = await insertTaskActivity(
      task_id,
      marked_status,
      activityTimeStamp,
      user_id,
      comment
    );

    // Step 7: Respond with success
    res.status(200).json({ message: "Task state updated successfully." });
  } catch (error) {
    console.error("Error updating task state:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getCreatedTasks = async (req, res) => {
  try {
    // Step 1: Decrypt session ID from the cookie
    const sessionId = req.body.cookie; // Assuming session_id is sent in body as cookie.
    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const decryptedSessionId = decryptSessionId(sessionId); // Decrypting session_id
    if (!decryptedSessionId) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    // Step 2: Get the user_id corresponding to the session_id
    const userId = await getUserIdBySessionId(decryptedSessionId);
    if (!userId) {
      return res
        .status(404)
        .json({ message: "User not found or session expired" });
    }

    // Step 3: Fetch all task_ids assigned to the user
    const taskIds = await getUserCreatedTasks(userId);
    if (!taskIds.length) {
      return res.status(404).json({ message: "No tasks found for this user" });
    }

    // Step 4: Traverse each task_id to fetch task details and most recent task activity
    const tasks = [];
    for (const taskId of taskIds) {
      const taskDetails = await getTaskDetails(taskId);
      if (!taskDetails) {
        continue; // Skip this task if no details are found
      }

      const mostRecentActivity = await getMostRecentTaskActivity(taskId);
      tasks.push({
        task_id: taskDetails.task_id,
        title: taskDetails.title,
        description: taskDetails.description,
        assigned_date: taskDetails.assigned_date,
        due_date: taskDetails.due_date,
        priority: taskDetails.priority,
        assigned_by_user_id: taskDetails.assigned_by_user_id,
        recent_log: mostRecentActivity
          ? {
              marked_status: mostRecentActivity.marked_status,
              activity_time_stamp: mostRecentActivity.activity_time_stamp,
              user_id: mostRecentActivity.user_id,
              comments: mostRecentActivity.comments,
            }
          : null,
      });
    }

    // Step 5: Return the list of tasks
    return res.status(200).json({ tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res
      .status(500)
      .json({ message: "Server error while fetching tasks" });
  }
};

const updateTask = async (req, res) => {
  try {
    // Step 1: Decrypt the session cookie and get user_id
    const { cookie, task_id, title, description, priority, due_date } =
      req.body;

    // Decrypt the session_id
    const session_id = decryptSessionId(cookie);
    if (!session_id) {
      return res.status(401).json({ message: "Session not found" });
    }

    // Step 2: Get user_id from the auth table based on session_id
    const user_id = await getUserIdBySessionId(session_id);
    if (!user_id) {
      return res.status(401).json({ message: "Invalid session" });
    }

    // Step 3: Validate task_id, user_id, and permissions
    const task = await getTaskDetails(task_id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const userExists = await findUserById(user_id);
    if (userExists.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    // Step 4: Check if the user has the permission to edit the task
    const permissions = await getUserFullPermissions(user_id);
    if (!permissions || permissions.edit_task === 0) {
      return res
        .status(403)
        .json({ message: "You don't have permission to update this task" });
    }

    // Step 5: Validate the new task details
    if (!title || !description || !priority || !due_date) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Step 6: Update the task details in the database
    const updatedTask = await updateTaskDetails(
      task_id,
      title,
      description,
      priority,
      due_date
    );
    if (updatedTask) {
      return res.status(200).json({ message: "Task updated successfully" });
    } else {
      return res.status(500).json({ message: "Failed to update task" });
    }
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteTask = async (req, res) => {
  try {
    // Step 1: Decrypt the session cookie
    const { cookie } = req.body;
    const session_id = decryptSessionId(cookie);

    if (!session_id) {
      return res.status(401).json({ message: "Invalid session cookie" });
    }

    // Step 2: Extract the user_id from the session_id
    const user_id = await getUserIdBySessionId(session_id);

    if (!user_id) {
      return res.status(401).json({ message: "User not found" });
    }

    // Step 3: Extract task_id from request body
    const { task_id } = req.body;

    // Step 4: Check if the user has permission to delete a task
    const permissions = await getUserFullPermissions(user_id);

    if (permissions.delete_task !== 1) {
      return res
        .status(403)
        .json({ message: "You do not have permission to delete tasks" });
    }

    // Step 5: Check if the task_id exists in the tasks table
    const taskExists = await checkTaskIdExists(task_id);

    if (!taskExists) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Step 6: Delete records from task_activity table related to the task_id
    await deleteTaskFromActivity(task_id);

    // Step 7: Delete the task from the tasks table
    await deleteTaskFromTasks(task_id);

    // Step 8: Send success response
    return res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({ message: "Error deleting task" });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTaskState,
  getCreatedTasks,
  updateTask,
  deleteTask,
};
