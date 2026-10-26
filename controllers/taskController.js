const Task = require("../models/Task");
const User = require("../models/User");
const PDFDocument = require("pdfkit");
const { sendTaskCompletedEmail } = require("../services/emailService");
const {
    generateTaskListKey,
    getCachedTaskList,
    setCachedTaskList,
    invalidateTaskListCache,
} = require("../services/cacheService");
const { taskEventEmitter } = require("../services/eventService");

// Status workflow hierarchy ranks: forward only
const STATUS_RANKS = {
    pending: 1,
    "in-progress": 2,
    completed: 3,
};

// ==================================================
// GET ALL TASKS (RBAC: Admin, Manager, Employee)
// GET /tasks (With node-cache 60s TTL)
// ==================================================

const getAllTasks = async (req, res, next) => {
    try {
        const role = req.user.role || "employee";
        const cacheKey = generateTaskListKey(req.user._id, role, req.query);

        // Check node-cache (Cache Hit)
        const cachedResponse = getCachedTaskList(cacheKey);
        if (cachedResponse !== undefined) {
            res.setHeader("X-Cache", "HIT");
            return res.status(200).json(cachedResponse);
        }

        res.setHeader("X-Cache", "MISS");

        const query = {};

        if (role === "admin") {
            // Admin can see all tasks, or filter by specific individual user
            if (req.query.userId) {
                query.$or = [{ user: req.query.userId }, { assignedTo: req.query.userId }];
            } else if (req.query.self === "true") {
                query.$or = [{ user: req.user._id }, { assignedTo: req.user._id }];
            }
        } else if (role === "manager") {
            // Manager can see:
            // 1. Tasks of a specific individual user
            // 2. Tasks created by or assigned to manager himself (self === "true")
            // 3. Tasks of employees under this manager
            if (req.query.userId) {
                query.$or = [{ user: req.query.userId }, { assignedTo: req.query.userId }];
            } else if (req.query.self === "true") {
                query.$or = [{ user: req.user._id }, { assignedTo: req.user._id }];
            } else {
                const subordinates = await User.find({ manager: req.user._id }).select("_id");
                const subordinateIds = subordinates.map((s) => s._id);

                query.$or = [
                    { user: req.user._id },
                    { assignedTo: req.user._id },
                    { assignedBy: req.user._id },
                    { user: { $in: subordinateIds } },
                    { assignedTo: { $in: subordinateIds } },
                ];
            }
        } else {
            // Employee can see tasks assigned to him OR created by him
            query.$or = [{ user: req.user._id }, { assignedTo: req.user._id }];
        }

        // Status filter
        if (req.query.status && ["pending", "in-progress", "completed"].includes(req.query.status)) {
            query.status = req.query.status;
        }

        // Priority filter
        if (req.query.priority && ["low", "medium", "high"].includes(req.query.priority)) {
            query.priority = req.query.priority;
        }

        // Date range filter
        if (req.query.startDate || req.query.endDate) {
            query.createdAt = {};
            if (req.query.startDate) {
                query.createdAt.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                const end = new Date(req.query.endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const tasks = await Task.find(query)
            .populate("user", "username email role")
            .populate("assignedTo", "username email role")
            .populate("assignedBy", "username email role")
            .sort({ createdAt: -1 });
            

        const responsePayload = {
            success: true,
            count: tasks.length,
            data: tasks,
        };

        // Cache the response in node-cache (with 60-second TTL)
        // Correctly caches empty task lists (count: 0, data: [])
        setCachedTaskList(cacheKey, responsePayload, 60);

        return res.status(200).json(responsePayload);
    } catch (error) {
        next(error);
    }
};

// ==================================================
// GET SINGLE TASK
// GET /tasks/:id
// ==================================================

const getTaskById = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate("user", "username email role")
            .populate("assignedTo", "username email role")
            .populate("assignedBy", "username email role");

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found.",
            });
        }

        // Authorization check
        const role = req.user.role || "employee";
        if (role === "admin") {
            // Admin has full access
        } else if (role === "manager") {
            const isOwner = task.user?._id?.toString() === req.user._id.toString();
            const isAssignee = task.assignedTo?._id?.toString() === req.user._id.toString();
            const isAssigner = task.assignedBy?._id?.toString() === req.user._id.toString();
            
            const subordinates = await User.find({ manager: req.user._id }).select("_id");
            const subordinateIds = subordinates.map((s) => s._id.toString());
            const isSubordinateTask =
                subordinateIds.includes(task.user?._id?.toString()) ||
                subordinateIds.includes(task.assignedTo?._id?.toString());

            if (!isOwner && !isAssignee && !isAssigner && !isSubordinateTask) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You are not authorized to view this task.",
                });
            }
        } else {
            const isOwner = task.user?._id?.toString() === req.user._id.toString();
            const isAssignee = task.assignedTo?._id?.toString() === req.user._id.toString();
            if (!isOwner && !isAssignee) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You can only view tasks assigned to or created by you.",
                });
            }
        }

        res.status(200).json({
            success: true,
            data: task,
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================
// CREATE TASK (Role-Based Assignment)
// POST /tasks
// ==================================================

const createTask = async (req, res, next) => {
    try {
        const { title, description, priority, status, assignedTo } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Task title is required.",
            });
        }

        const validStatuses = ["pending", "in-progress", "completed"];
        const taskStatus = validStatuses.includes(status) ? status : "pending";

        const validPriorities = ["low", "medium", "high"];
        const taskPriority = validPriorities.includes(priority) ? priority : "medium";

        const role = req.user.role || "employee";
        let targetAssignee = req.user._id;

        if (role === "admin") {
            // Admin can assign task to ANY user or employee
            if (assignedTo) {
                const userExists = await User.findById(assignedTo);
                if (!userExists) {
                    return res.status(400).json({
                        success: false,
                        message: "Assigned user does not exist.",
                    });
                }
                targetAssignee = assignedTo;
            }
        } else if (role === "manager") {
            // Manager can assign task to employees under him or any employee, or to himself
            if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
                const targetUser = await User.findById(assignedTo);
                if (!targetUser) {
                    return res.status(400).json({
                        success: false,
                        message: "Assigned employee does not exist.",
                    });
                }
                targetAssignee = assignedTo;
            }
        } else {
            // Employee can only add his own tasks
            targetAssignee = req.user._id;
        }

        const task = await Task.create({
            user: targetAssignee,
            assignedTo: targetAssignee,
            assignedBy: req.user._id,
            title: title.trim(),
            description: description ? description.trim() : "",
            priority: taskPriority,
            status: taskStatus,
            completed: taskStatus === "completed",
        });

        const populatedTask = await Task.findById(task._id)
            .populate("user", "username email role")
            .populate("assignedTo", "username email role")
            .populate("assignedBy", "username email role");

        // If created directly as completed, send notification email
        if (task.status === "completed") {
            sendTaskCompletedEmail(populatedTask.assignedTo || req.user, task).catch((err) =>
                console.error("Task completion email notification error:", err)
            );
        }

        // Invalidate affected task-list cache entries immediately
        const affectedUsers = [
            req.user._id,
            populatedTask.assignedTo?._id,
            populatedTask.user?._id,
        ];
        invalidateTaskListCache(affectedUsers);

        // PRACTICAL 10: Emit 'task-created' event asynchronously via EventEmitter
        const emittedAt = new Date();
        console.log(`[API Controller] [${emittedAt.toISOString()}] Emitting 'task-created' event for "${populatedTask.title}"...`);
        taskEventEmitter.emit("task-created", {
            taskId: populatedTask._id,
            title: populatedTask.title,
            description: populatedTask.description,
            priority: populatedTask.priority,
            status: populatedTask.status,
            assignedTo: populatedTask.assignedTo,
            assignedBy: populatedTask.assignedBy,
            emittedAt,
            simulateError: req.body.simulateError || false,
        });

        const respondedAt = new Date();
        console.log(`[API Controller] [${respondedAt.toISOString()}] Responding HTTP 201 Created immediately.`);

        res.status(201).json({
            success: true,
            message: "Task created successfully.",
            data: populatedTask,
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================
// UPDATE TASK (With Segregation & Reversal Prevention)
// PUT /tasks/:id
// ==================================================

const updateTask = async (req, res, next) => {
    try {
        const { title, description, priority, status, assignedTo } = req.body;
        const role = req.user.role || "employee";

        // Find existing task first
        const existingTask = await Task.findById(req.params.id);

        if (!existingTask) {
            return res.status(404).json({
                success: false,
                message: "Task not found.",
            });
        }

        // Check update permission
        if (role === "admin") {
            // Admin can update any task
        } else if (role === "manager") {
            const isOwner = existingTask.user?.toString() === req.user._id.toString();
            const isAssignee = existingTask.assignedTo?.toString() === req.user._id.toString();
            const isAssigner = existingTask.assignedBy?.toString() === req.user._id.toString();

            const subordinates = await User.find({ manager: req.user._id }).select("_id");
            const subordinateIds = subordinates.map((s) => s._id.toString());
            const isSubordinateTask =
                subordinateIds.includes(existingTask.user?.toString()) ||
                subordinateIds.includes(existingTask.assignedTo?.toString());

            if (!isOwner && !isAssignee && !isAssigner && !isSubordinateTask) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You can only update tasks in your team.",
                });
            }
        } else {
            // Employee can update tasks assigned to him or created by him
            const isOwner = existingTask.user?.toString() === req.user._id.toString();
            const isAssignee = existingTask.assignedTo?.toString() === req.user._id.toString();

            if (!isOwner && !isAssignee) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You can only update your own assigned tasks.",
                });
            }
        }

        const updateData = {};

        if (title !== undefined) {
            if (!title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Task title cannot be empty.",
                });
            }
            updateData.title = title.trim();
        }

        if (description !== undefined) {
            updateData.description = description.trim();
        }

        if (priority !== undefined) {
            if (!["low", "medium", "high"].includes(priority)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid priority. Must be low, medium, or high.",
                });
            }
            updateData.priority = priority;
        }

        if (assignedTo && (role === "admin" || role === "manager")) {
            const userExists = await User.findById(assignedTo);
            if (userExists) {
                updateData.assignedTo = assignedTo;
                updateData.user = assignedTo;
            }
        }

        let isMarkedCompleted = false;

        if (status !== undefined) {
            if (!["pending", "in-progress", "completed"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid task status.",
                });
            }

            const currentRank = STATUS_RANKS[existingTask.status] || 1;
            const newRank = STATUS_RANKS[status] || 1;

            // Strict Forward-Only Workflow Check (No Reversals Allowed)
            if (newRank < currentRank) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status transition: Tasks cannot be moved backwards from '${existingTask.status}' to '${status}'. Workflow is forward-only (Pending -> In Progress -> Completed).`,
                });
            }

            updateData.status = status;
            updateData.completed = status === "completed";

            if (existingTask.status !== "completed" && status === "completed") {
                isMarkedCompleted = true;
            }
        }

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        )
            .populate("user", "username email role")
            .populate("assignedTo", "username email role")
            .populate("assignedBy", "username email role");

        // Send task completion email when status transitions to completed
        if (isMarkedCompleted) {
            const recipientUser = updatedTask.assignedTo || updatedTask.user || req.user;
            sendTaskCompletedEmail(recipientUser, updatedTask).catch((err) =>
                console.error("Task completion email notification error:", err)
            );
        }

        // Invalidate affected task-list cache entries immediately
        const affectedUsers = [
            req.user._id,
            existingTask.user,
            existingTask.assignedTo,
            existingTask.assignedBy,
            updatedTask.user?._id,
            updatedTask.assignedTo?._id,
        ];
        invalidateTaskListCache(affectedUsers);

        res.status(200).json({
            success: true,
            message: "Task updated successfully.",
            data: updatedTask,
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================
// DELETE TASK
// DELETE /tasks/:id
// ==================================================

const deleteTask = async (req, res, next) => {
    try {
        const role = req.user.role || "employee";
        const existingTask = await Task.findById(req.params.id);

        if (!existingTask) {
            return res.status(404).json({
                success: false,
                message: "Task not found.",
            });
        }

        if (role === "admin") {
            // Admin can delete any task
        } else if (role === "manager") {
            // Manager can delete tasks created or assigned by him
            const isOwner = existingTask.user?.toString() === req.user._id.toString();
            const isAssigner = existingTask.assignedBy?.toString() === req.user._id.toString();
            if (!isOwner && !isAssigner) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. Managers can only delete tasks created or assigned by them.",
                });
            }
        } else {
            // Employee can delete tasks created by him (self-created)
            const isOwner = existingTask.user?.toString() === req.user._id.toString();
            const isSelfAssigned = !existingTask.assignedBy || existingTask.assignedBy.toString() === req.user._id.toString();
            if (!isOwner || !isSelfAssigned) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. Employees cannot delete tasks assigned by a manager or admin.",
                });
            }
        }

        await Task.findByIdAndDelete(req.params.id);

        // Invalidate affected task-list cache entries immediately
        const affectedUsers = [
            req.user._id,
            existingTask.user,
            existingTask.assignedTo,
            existingTask.assignedBy,
        ];
        invalidateTaskListCache(affectedUsers);

        // PRACTICAL 10: Emit 'task-deleted' event asynchronously via EventEmitter
        const deletedAt = new Date();
        console.log(`[API Controller] [${deletedAt.toISOString()}] Emitting 'task-deleted' event for "${existingTask.title}"...`);
        taskEventEmitter.emit("task-deleted", {
            taskId: existingTask._id,
            title: existingTask.title,
            deletedBy: req.user,
            deletedAt,
        });

        const respondedAt = new Date();
        console.log(`[API Controller] [${respondedAt.toISOString()}] Responding HTTP 200 OK for deletion immediately.`);

        res.status(200).json({
            success: true,
            message: "Task deleted successfully.",
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================
// GET TASK STATS (Date Range & RBAC)
// GET /tasks/report/stats
// ==================================================

const getTaskStats = async (req, res, next) => {
    try {
        const { startDate, endDate, userId, allUsers, self } = req.query;
        const query = {};
        const role = req.user.role || "employee";

        if (role === "admin") {
            if (userId) {
                query.$or = [{ user: userId }, { assignedTo: userId }];
            } else if (self === "true") {
                query.$or = [{ user: req.user._id }, { assignedTo: req.user._id }];
            }
        } else if (role === "manager") {
            if (userId) {
                query.$or = [{ user: userId }, { assignedTo: userId }];
            } else if (self === "true") {
                query.$or = [{ user: req.user._id }, { assignedTo: req.user._id }];
            } else if (allUsers !== "true") {
                const subordinates = await User.find({ manager: req.user._id }).select("_id");
                const subordinateIds = subordinates.map((s) => s._id);
                query.$or = [
                    { user: req.user._id },
                    { assignedTo: req.user._id },
                    { assignedBy: req.user._id },
                    { user: { $in: subordinateIds } },
                    { assignedTo: { $in: subordinateIds } },
                ];
            }
        } else {
            query.$or = [{ user: req.user._id }, { assignedTo: req.user._id }];
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const tasks = await Task.find(query);

        const total = tasks.length;
        const pending = tasks.filter((t) => t.status === "pending").length;
        const inProgress = tasks.filter((t) => t.status === "in-progress").length;
        const completed = tasks.filter((t) => t.status === "completed").length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        res.status(200).json({
            success: true,
            stats: {
                total,
                pending,
                inProgress,
                completed,
                completionRate,
                dateRange: {
                    startDate: startDate || null,
                    endDate: endDate || null,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================
// GENERATE & DOWNLOAD TASKS REPORT (PDF WITH DATE FILTER & RBAC)
// GET /tasks/download/:status or GET /tasks/report/pdf
// ==================================================

const downloadTasksPDF = async (req, res, next) => {
    try {
        const { status } = req.params;
        const { startDate, endDate, priority, userId, allUsers } = req.query;
        const role = req.user.role || "employee";

        // Strict Role Check: ONLY Admin can generate system-wide date-range reports
        if ((startDate || endDate) && allUsers === "true") {
            if (role !== "admin") {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. Only Administrators are permitted to generate system-wide date-range reports.",
                });
            }
        }

        const query = {};

        // RBAC access control
        if (role === "admin") {
            if (userId) {
                query.$or = [{ user: userId }, { assignedTo: userId }];
            }
        } else if (role === "manager") {
            if (userId) {
                query.$or = [{ user: userId }, { assignedTo: userId }];
            } else {
                const subordinates = await User.find({ manager: req.user._id }).select("_id");
                const subordinateIds = subordinates.map((s) => s._id);
                query.$or = [
                    { user: req.user._id },
                    { assignedTo: req.user._id },
                    { assignedBy: req.user._id },
                    { user: { $in: subordinateIds } },
                    { assignedTo: { $in: subordinateIds } },
                ];
            }
        } else {
            query.$or = [{ user: req.user._id }, { assignedTo: req.user._id }];
        }

        const validStatuses = ["pending", "in-progress", "completed"];
        const selectedStatus = status || req.query.status;

        if (validStatuses.includes(selectedStatus)) {
            query.status = selectedStatus;
        }

        if (priority && ["low", "medium", "high"].includes(priority)) {
            query.priority = priority;
        }

        // Date range filtering
        let dateRangeLabel = "All Time";
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }

            if (startDate && endDate) {
                dateRangeLabel = `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
            } else if (startDate) {
                dateRangeLabel = `From ${new Date(startDate).toLocaleDateString()}`;
            } else if (endDate) {
                dateRangeLabel = `Until ${new Date(endDate).toLocaleDateString()}`;
            }
        }

        const tasks = await Task.find(query)
            .populate("user", "username email role")
            .populate("assignedTo", "username email role")
            .populate("assignedBy", "username email role")
            .sort({ createdAt: -1 });

        // Calculate metrics
        const totalCount = tasks.length;
        const pendingCount = tasks.filter((t) => t.status === "pending").length;
        const inProgressCount = tasks.filter((t) => t.status === "in-progress").length;
        const completedCount = tasks.filter((t) => t.status === "completed").length;
        const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        // Initialize PDF Document
        const doc = new PDFDocument({ margin: 40, size: "A4" });

        const filename = `task-report-${selectedStatus || "all"}-${Date.now()}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`
        );

        doc.pipe(res);

        // Header Background Banner
        doc.rect(0, 0, 595.28, 90).fill("#4f46e5");

        // Header Titles
        doc.fillColor("#ffffff")
            .fontSize(22)
            .font("Helvetica-Bold")
            .text("TASK MANAGEMENT SYSTEM", 40, 25);

        doc.fontSize(11)
            .font("Helvetica")
            .fillColor("#e0e7ff")
            .text("Comprehensive Project & Task Progress Report", 40, 52);

        doc.moveDown(3.5);

        // Metadata section
        const userRoleText = (req.user.role || "Employee").toUpperCase();
        doc.fillColor("#1e293b")
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(`Generated By: `, 40, 105, { continued: true })
            .font("Helvetica")
            .text(`${req.user.username} (${req.user.email}) [Role: ${userRoleText}]`);

        doc.font("Helvetica-Bold")
            .text(`Date Filter: `, 40, 122, { continued: true })
            .font("Helvetica")
            .text(dateRangeLabel);

        doc.font("Helvetica-Bold")
            .text(`Generated On: `, 40, 139, { continued: true })
            .font("Helvetica")
            .text(new Date().toLocaleString());

        // Horizontal line
        doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(40, 160).lineTo(555, 160).stroke();

        // Summary Statistics Box
        doc.rect(40, 172, 515, 60).fillAndStroke("#f8fafc", "#cbd5e1");

        doc.fillColor("#475569").fontSize(9).font("Helvetica-Bold");
        doc.text("TOTAL TASKS", 60, 185);
        doc.text("PENDING", 165, 185);
        doc.text("IN PROGRESS", 265, 185);
        doc.text("COMPLETED", 380, 185);
        doc.text("COMPLETION", 475, 185);

        doc.fontSize(16).font("Helvetica-Bold");
        doc.fillColor("#1e293b").text(`${totalCount}`, 60, 202);
        doc.fillColor("#eab308").text(`${pendingCount}`, 165, 202);
        doc.fillColor("#3b82f6").text(`${inProgressCount}`, 265, 202);
        doc.fillColor("#10b981").text(`${completedCount}`, 380, 202);
        doc.fillColor("#6366f1").text(`${rate}%`, 475, 202);

        doc.y = 250;

        // Section Title
        doc.fillColor("#1e293b")
            .fontSize(14)
            .font("Helvetica-Bold")
            .text(`Tasks Details (${selectedStatus ? selectedStatus.toUpperCase() : "ALL STATUSES"})`, 40, 255);

        doc.moveDown(1);

        if (tasks.length === 0) {
            doc.moveDown(2);
            doc.fontSize(12)
                .font("Helvetica")
                .fillColor("#64748b")
                .text("No tasks found matching the selected filters and date range.", 40, 290, {
                    align: "center",
                });
        } else {
            let currentY = 285;

            tasks.forEach((task, index) => {
                // Page break check
                if (currentY > 700) {
                    doc.addPage();
                    currentY = 50;
                }

                // Task Card Background
                doc.rect(40, currentY, 515, 75).fillAndStroke("#ffffff", "#e2e8f0");

                // Priority color indicator
                let priorityColor = "#64748b";
                if (task.priority === "high") priorityColor = "#ef4444";
                if (task.priority === "medium") priorityColor = "#f59e0b";
                if (task.priority === "low") priorityColor = "#10b981";

                doc.rect(40, currentY, 4, 75).fill(priorityColor);

                // Task Title
                doc.fillColor("#0f172a")
                    .fontSize(11)
                    .font("Helvetica-Bold")
                    .text(`${index + 1}. ${task.title}`, 52, currentY + 8, {
                        width: 320,
                        ellipsis: true,
                    });

                // Assignee and Assigner info
                const assignedToName = task.assignedTo?.username || task.user?.username || "Self";
                const assignedByName = task.assignedBy?.username || "Self";

                // Status & Priority Badges
                doc.fontSize(8.5).font("Helvetica");
                doc.fillColor("#475569")
                    .text(`Status: ${task.status.toUpperCase()} | Priority: ${(task.priority || "medium").toUpperCase()} | Assigned to: ${assignedToName} (By: ${assignedByName})`, 52, currentY + 24);

                // Dates
                doc.fontSize(8).fillColor("#64748b")
                    .text(`Created: ${new Date(task.createdAt).toLocaleDateString()}`, 52, currentY + 38);

                // Task Description
                if (task.description) {
                    doc.fontSize(8.5)
                        .font("Helvetica-Oblique")
                        .fillColor("#64748b")
                        .text(task.description, 52, currentY + 52, {
                            width: 480,
                            height: 16,
                            ellipsis: true,
                        });
                } else {
                    doc.fontSize(8.5)
                        .font("Helvetica-Oblique")
                        .fillColor("#94a3b8")
                        .text("No description provided.", 52, currentY + 52);
                }

                currentY += 85;
            });
        }

        // Footer on all pages
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8)
                .fillColor("#94a3b8")
                .text(
                    `Page ${i + 1} of ${range.count} | Task Management System Confidential Report`,
                    40,
                    800,
                    { align: "center", width: 515 }
                );
        }

        doc.end();
    } catch (error) {
        next(error);
    }
};

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    getTaskStats,
    downloadTasksPDF,
};