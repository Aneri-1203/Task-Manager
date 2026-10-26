// ==================================================
// TASK-MANAGER.JS
// Task Management Client with Role-Based Views & Notifications
// ==================================================

const API = "/tasks";
let currentStatus = "pending";
let allTasks = [];
let currentUser = null;

// Status workflow hierarchy ranks (strictly forward-only)
const STATUS_RANKS = {
    pending: 1,
    "in-progress": 2,
    completed: 3,
};

// ==================================================
// Session Management & Auth
// ==================================================

function getToken() {
    return localStorage.getItem("token");
}

function getUser() {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        return null;
    }
}

let idleTimer = null;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        alert("Your session has timed out due to inactivity. Please log in again.");
        logoutUser();
    }, IDLE_TIMEOUT_MS);
}

// Activity listeners for session tracking
["mousemove", "keydown", "click", "scroll"].forEach((evt) => {
    window.addEventListener(evt, resetIdleTimer, { passive: true });
});

async function validateSession() {
    const token = getToken();
    if (!token) {
        window.location.replace("/login.html");
        return false;
    }

    try {
        const response = await fetch("/auth/me", {
            headers: {
                Authorization: "Bearer " + token,
            },
        });

        if (!response.ok) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.replace("/login.html");
            return false;
        }

        const result = await response.json();
        if (result.user) {
            currentUser = result.user;
            localStorage.setItem("user", JSON.stringify(result.user));
            renderUserInfo(result.user);
        }

        resetIdleTimer();
        return true;
    } catch (err) {
        console.error("Session validation error:", err);
        return false;
    }
}

// ==================================================
// Render User Info & Role-Based View (Admin vs User)
// ==================================================

function renderUserInfo(user) {
    if (!user) user = getUser();
    if (!user) return;

    currentUser = user;
    const usernameDisplay = document.getElementById("usernameDisplay");
    const emailDisplay = document.getElementById("emailDisplay");
    const roleBadge = document.getElementById("roleBadge");
    const avatarEl = document.getElementById("userAvatar");
    const adminBanner = document.getElementById("adminBanner");
    const adminReportCard = document.getElementById("adminReportCard");
    const userColumnHeader = document.getElementById("userColumnHeader");
    const headerSubtitle = document.getElementById("headerSubtitle");

    if (usernameDisplay) usernameDisplay.textContent = user.username || "User";
    if (emailDisplay) emailDisplay.textContent = user.email || "";

    const role = (user.role || "user").toLowerCase();
    if (roleBadge) {
        roleBadge.textContent = role.toUpperCase();
        roleBadge.className = `role-badge role-${role}`;
    }

    if (avatarEl) {
        const username = user.username || "User";
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6366f1&color=fff&bold=true`;
        const profilePic = user.profilePicture || fallbackUrl;

        avatarEl.innerHTML = `
            <img 
                src="${escapeHtml(profilePic)}" 
                alt="${escapeHtml(username)}" 
                referrerpolicy="no-referrer"
                onerror="this.onerror=null; this.src='${fallbackUrl}';"
                style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;"
            >
        `;
    }

    // Role-Specific View Adaptation (Admin vs Standard User)
    const isAdmin = role === "admin";

    if (adminBanner) {
        adminBanner.style.display = isAdmin ? "block" : "none";
    }

    if (adminReportCard) {
        // Date-Range Report generation is strictly for Admins
        adminReportCard.style.display = isAdmin ? "block" : "none";
    }

    if (userColumnHeader) {
        userColumnHeader.style.display = isAdmin ? "table-cell" : "none";
    }

    if (headerSubtitle) {
        if (isAdmin) {
            headerSubtitle.textContent = "Administrator Portal • System-wide Oversight & Date-Range Reports";
        } else {
            headerSubtitle.textContent = "Manage and track your project tasks easily";
        }
    }
}

function logoutUser() {
    const token = getToken();
    if (token) {
        fetch("/auth/logout", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + token,
            },
        }).catch(() => {});
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login.html";
}

// ==================================================
// Status Helpers
// ==================================================

function getStatusName(status) {
    if (status === "pending") return "Pending";
    if (status === "in-progress") return "In Progress";
    if (status === "completed") return "Completed";
    return "Pending";
}

function getTaskStatus(task) {
    if (task.status) return task.status;
    if (task.completed === true) return "completed";
    return "pending";
}

// ==================================================
// Load Tasks
// ==================================================

async function loadTasks() {
    const token = getToken();
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    try {
        const response = await fetch(API, {
            headers: {
                Authorization: "Bearer " + token,
            },
        });

        if (response.status === 401) {
            logoutUser();
            return;
        }

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || "Failed to load tasks");
        }

        allTasks = result.data || [];
        updateCounts();
        displayTasks();
    } catch (error) {
        console.error("Load tasks error:", error);
    }
}

// ==================================================
// Update Status Counts
// ==================================================

function updateCounts() {
    const pending = allTasks.filter((t) => getTaskStatus(t) === "pending").length;
    const inProgress = allTasks.filter((t) => getTaskStatus(t) === "in-progress").length;
    const completed = allTasks.filter((t) => getTaskStatus(t) === "completed").length;

    const pBadge = document.getElementById("pendingCount");
    const iBadge = document.getElementById("inProgressCount");
    const cBadge = document.getElementById("completedCount");

    if (pBadge) pBadge.textContent = pending;
    if (iBadge) iBadge.textContent = inProgress;
    if (cBadge) cBadge.textContent = completed;
}

// ==================================================
// Switch Tab / Filter
// ==================================================

function showStatusTasks(status) {
    currentStatus = status;

    document.querySelectorAll(".status-tab").forEach((tab) => {
        if (tab.getAttribute("data-status") === status) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });

    const titleEl = document.getElementById("currentStatusTitle");
    const descEl = document.getElementById("taskListDescription");

    if (status === "pending") {
        if (titleEl) titleEl.innerHTML = '<i class="fa-regular fa-clock"></i> Pending Tasks';
        if (descEl) descEl.textContent = "Tasks that are waiting to be started";
    } else if (status === "in-progress") {
        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-spinner"></i> In Progress Tasks';
        if (descEl) descEl.textContent = "Tasks currently being worked on";
    } else if (status === "completed") {
        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Completed Tasks';
        if (descEl) descEl.textContent = "Tasks that have been finished (Confirmation email sent)";
    }

    displayTasks();
}

// ==================================================
// Display Tasks in Table
// ==================================================

function displayTasks() {
    const table = document.getElementById("taskTable");
    if (!table) return;

    table.innerHTML = "";

    const filteredTasks = allTasks.filter(
        (task) => getTaskStatus(task) === currentStatus
    );

    const isAdmin = currentUser && currentUser.role === "admin";
    const colSpan = isAdmin ? 8 : 7;

    if (filteredTasks.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="${colSpan}" style="text-align:center; padding: 2.5rem; color: #888;">
                    <i class="fa-regular fa-folder-open" style="font-size: 2.2rem; margin-bottom: 0.5rem; display:block; color:#94a3b8;"></i>
                    No ${getStatusName(currentStatus)} Tasks Available
                </td>
            </tr>
        `;
        return;
    }

    filteredTasks.forEach((task, index) => {
        const status = getTaskStatus(task);
        const priority = task.priority || "medium";
        const createdDate = task.createdAt
            ? new Date(task.createdAt).toLocaleDateString()
            : "N/A";

        // Generate forward-only workflow progression buttons
        let workflowButton = "";
        if (status === "pending") {
            workflowButton = `
                <button class="flow-btn flow-start" onclick="advanceTaskWorkflow('${task._id}', 'in-progress')" title="Advance to In Progress">
                    <i class="fa-solid fa-play"></i> Start
                </button>
                <button class="flow-btn flow-complete" onclick="advanceTaskWorkflow('${task._id}', 'completed')" title="Mark as Completed & Send Email">
                    <i class="fa-solid fa-check"></i> Complete
                </button>
            `;
        } else if (status === "in-progress") {
            workflowButton = `
                <button class="flow-btn flow-complete" onclick="advanceTaskWorkflow('${task._id}', 'completed')" title="Mark as Completed & Send Email">
                    <i class="fa-solid fa-check-double"></i> Complete
                </button>
            `;
        } else {
            workflowButton = `
                <span class="locked-status-badge" title="Completed tasks are locked against reversals">
                    <i class="fa-solid fa-lock"></i> Locked
                </span>
            `;
        }

        const userCell = isAdmin
            ? `<td><span class="user-pill"><i class="fa-regular fa-user"></i> ${escapeHtml(task.user?.username || "Self")}</span></td>`
            : "";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(task.title)}</strong></td>
            <td>${escapeHtml(task.description || "-")}</td>
            <td>
                <span class="badge priority-${priority}">
                    ${capitalize(priority)}
                </span>
            </td>
            <td>
                <span class="status ${status}">
                    ${getStatusName(status)}
                </span>
            </td>
            ${userCell}
            <td>${createdDate}</td>
            <td class="action-cell">
                ${workflowButton}
                <button class="update-btn" onclick="editTask('${task._id}')" title="Edit Task details">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="delete-btn" onclick="deleteTask('${task._id}')" title="Delete Task">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        table.appendChild(tr);
    });
}

// ==================================================
// Advance Task Workflow (Forward-Only Transition & Email Trigger)
// ==================================================

async function advanceTaskWorkflow(taskId, targetStatus) {
    const token = getToken();
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    const task = allTasks.find((t) => t._id === taskId);
    if (!task) return;

    const currentStatusVal = getTaskStatus(task);
    const currentRank = STATUS_RANKS[currentStatusVal] || 1;
    const targetRank = STATUS_RANKS[targetStatus] || 1;

    // Strict Segregation Check
    if (targetRank < currentRank) {
        alert(
            `Task Workflow Rule:\n\nTasks cannot be reversed backwards from '${getStatusName(currentStatusVal)}' to '${getStatusName(targetStatus)}'.\n\nWorkflow is forward-only: Pending -> In Progress -> Completed.`
        );
        return;
    }

    try {
        const response = await fetch(`${API}/${taskId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
            body: JSON.stringify({
                status: targetStatus,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to update task status.");
        }

        if (targetStatus === "completed") {
            alert(`Task "${task.title}" has been completed!\nA notification email has been dispatched via Nodemailer to ${currentUser?.email || 'your email'}.`);
        }

        await loadTasks();
    } catch (err) {
        console.error("Workflow update error:", err);
        alert(err.message || "Unable to update task status.");
    }
}

// ==================================================
// Add Task
// ==================================================

async function addTask(event) {
    if (event) event.preventDefault();

    const token = getToken();
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    const titleInput = document.getElementById("title");
    const descInput = document.getElementById("description");
    const priorityInput = document.getElementById("priority");
    const statusRadio = document.querySelector('input[name="status"]:checked');

    const title = titleInput.value.trim();
    const description = descInput ? descInput.value.trim() : "";
    const priority = priorityInput ? priorityInput.value : "medium";
    const status = statusRadio ? statusRadio.value : "pending";

    if (!title) {
        alert("Please enter a task title.");
        titleInput.focus();
        return;
    }

    const addButton = document.getElementById("addTaskButton");
    if (addButton) addButton.disabled = true;

    try {
        const response = await fetch(API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
            body: JSON.stringify({
                title,
                description,
                priority,
                status,
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || "Failed to add task.");
        }

        titleInput.value = "";
        if (descInput) descInput.value = "";
        if (priorityInput) priorityInput.value = "medium";
        const defaultRadio = document.querySelector('input[name="status"][value="pending"]');
        if (defaultRadio) defaultRadio.checked = true;

        if (status === "completed") {
            alert(`Task "${title}" created as completed!\nA completion notification email has been dispatched to ${currentUser?.email || 'your email'}.`);
        }

        await loadTasks();
        showStatusTasks(status);
    } catch (error) {
        console.error("Add task error:", error);
        alert(error.message || "Failed to add task.");
    } finally {
        if (addButton) addButton.disabled = false;
    }
}

// ==================================================
// Edit Task (With Forward-Only Segregation Validation)
// ==================================================

async function editTask(id) {
    const token = getToken();
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    const task = allTasks.find((item) => item._id === id);
    if (!task) {
        alert("Task not found.");
        return;
    }

    const newTitle = prompt("Update Task Title:", task.title);
    if (newTitle === null) return;
    if (!newTitle.trim()) {
        alert("Task title cannot be empty.");
        return;
    }

    const newDesc = prompt("Update Task Description (optional):", task.description || "");
    if (newDesc === null) return;

    const currentStatusVal = getTaskStatus(task);
    const currentRank = STATUS_RANKS[currentStatusVal] || 1;

    let statusPromptText = "";
    if (currentStatusVal === "pending") {
        statusPromptText = "Select New Status:\n1. Pending (Keep current)\n2. In Progress\n3. Completed\n\nEnter 1, 2, or 3:";
    } else if (currentStatusVal === "in-progress") {
        statusPromptText = "Select New Status:\n2. In Progress (Keep current)\n3. Completed (Advance)\n(Note: Reversal to Pending is blocked)\n\nEnter 2 or 3:";
    } else {
        statusPromptText = "Task is Completed (Locked against backward reversal).\nPress OK to save title/description.";
    }

    let newStatus = currentStatusVal;
    if (currentStatusVal !== "completed") {
        const choice = prompt(statusPromptText, currentRank.toString());
        if (choice === null) return;

        if (choice === "1") newStatus = "pending";
        else if (choice === "2") newStatus = "in-progress";
        else if (choice === "3") newStatus = "completed";

        const newRank = STATUS_RANKS[newStatus] || 1;
        if (newRank < currentRank) {
            alert(
                `Invalid transition: Tasks cannot be moved backwards from '${getStatusName(currentStatusVal)}' to '${getStatusName(newStatus)}'. Status remained unchanged.`
            );
            newStatus = currentStatusVal;
        }
    }

    try {
        const response = await fetch(API + "/" + id, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
            body: JSON.stringify({
                title: newTitle.trim(),
                description: newDesc.trim(),
                status: newStatus,
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || "Failed to update task.");
        }

        if (currentStatusVal !== "completed" && newStatus === "completed") {
            alert(`Task "${newTitle}" marked as completed!\nA notification email has been sent.`);
        }

        await loadTasks();
    } catch (error) {
        console.error("Update task error:", error);
        alert(error.message || "Failed to update task.");
    }
}

// ==================================================
// Delete Task
// ==================================================

async function deleteTask(id) {
    const token = getToken();
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    if (!confirm("Are you sure you want to delete this task?")) {
        return;
    }

    try {
        const response = await fetch(API + "/" + id, {
            method: "DELETE",
            headers: {
                Authorization: "Bearer " + token,
            },
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || "Failed to delete task.");
        }

        await loadTasks();
    } catch (error) {
        console.error("Delete task error:", error);
        alert(error.message || "Failed to delete task.");
    }
}

// ==================================================
// Admin Date-Range Filtered PDF Report Generator
// ==================================================

function setDatePreset(preset) {
    const startInput = document.getElementById("reportStartDate");
    const endInput = document.getElementById("reportEndDate");

    const today = new Date();

    if (preset === "month") {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        startInput.value = firstDay.toISOString().split("T")[0];
        endInput.value = today.toISOString().split("T")[0];
    } else if (preset === "all") {
        startInput.value = "";
        endInput.value = "";
    }
}

async function generateDateFilteredReport(event) {
    if (event) event.preventDefault();

    const token = getToken();
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    // Role check
    if (!currentUser || currentUser.role !== "admin") {
        alert("Access denied: Only Administrators are authorized to generate date-range reports.");
        return;
    }

    const startDate = document.getElementById("reportStartDate").value;
    const endDate = document.getElementById("reportEndDate").value;
    const status = document.getElementById("reportStatus").value;
    const allUsersSelect = document.getElementById("reportAllUsers");
    const allUsers = allUsersSelect ? allUsersSelect.value : "true";

    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (status && status !== "all") params.append("status", status);
    if (allUsers === "true") params.append("allUsers", "true");

    const downloadUrl = `${API}/report/pdf?${params.toString()}`;
    const generateBtn = document.getElementById("generateReportBtn");

    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF...';
    }

    try {
        const response = await fetch(downloadUrl, {
            headers: {
                Authorization: "Bearer " + token,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            alert(error.message || "Failed to generate PDF report.");
            return;
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `Admin-Task-Report-${startDate || "all"}-to-${endDate || "all"}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
        console.error("PDF generation error:", err);
        alert("Failed to download PDF report. Please try again.");
    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Generate & Download Date-Range PDF';
        }
    }
}

// Download PDF for current tab (Available for all users)
async function downloadCurrentStatusPDF() {
    const token = getToken();
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    try {
        const response = await fetch(`${API}/download/${currentStatus}`, {
            headers: {
                Authorization: "Bearer " + token,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            alert(error.message || "Failed to download PDF.");
            return;
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `tasks-${currentStatus}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
        console.error("PDF download error:", err);
        window.location.href = `${API}/download/${currentStatus}?token=${encodeURIComponent(token)}`;
    }
}

// ==================================================
// String Escape Helpers
// ==================================================

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==================================================
// Initial Execution
// ==================================================

window.addEventListener("DOMContentLoaded", async () => {
    renderUserInfo();
    const isValid = await validateSession();
    if (isValid) {
        loadTasks();
    }
});
