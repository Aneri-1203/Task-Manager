const express = require("express");

const router = express.Router();

const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
  downloadTasksPDF,
} = require("../controllers/taskController");

const authMiddleware = require("../middleware/authMiddleware");

// Protect all task routes with JWT authentication
router.use(authMiddleware);

// ==================================================
// GET /tasks
// Get all tasks
// ==================================================
router.get("/", getAllTasks);

// ==================================================
// GET /tasks/report/stats
// Get task statistics (with optional date range & RBAC)
// ==================================================
router.get("/report/stats", getTaskStats);

// ==================================================
// GET /tasks/report/pdf
// Download comprehensive date-filtered PDF report
// ==================================================
router.get("/report/pdf", downloadTasksPDF);

// ==================================================
// GET /tasks/download/:status
// Download tasks of selected status as PDF
// ==================================================
router.get("/download/:status", downloadTasksPDF);

// ==================================================
// GET /tasks/:id
// Get single task
// ==================================================
router.get("/:id", getTaskById);

// ==================================================
// POST /tasks
// Create task
// ==================================================
router.post("/", createTask);

// ==================================================
// PUT & PATCH /tasks/:id
// Update task
// ==================================================
router.put("/:id", updateTask);
router.patch("/:id", updateTask);

// ==================================================
// DELETE /tasks/:id
// Delete task
// ==================================================
router.delete("/:id", deleteTask);

module.exports = router;