const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate"); // Assuming the middleware is in 'middlewares/authenticate.js'
const {
  createTask,
  getTasks,
  getTaskById,
  updateTaskState,
  getCreatedTasks,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

// Example route
router.post("/test", authenticate, (req, res) => {
  res.status(200).json({ message: "Success" });
});

router.post("/createTask", authenticate, createTask);

router.post("/getTasks", authenticate, getTasks);

router.post("/getTaskById", authenticate, getTaskById);

router.post("/updateTaskState", authenticate, updateTaskState);

router.post("/getCreatedTasks", authenticate, getCreatedTasks);

router.post("/updateTask", authenticate, updateTask);

router.post("/deleteTask", authenticate, deleteTask);

module.exports = router; // Export the router
