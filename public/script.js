// ==================================================
// API
// ==================================================

const API = "/tasks";


// Currently selected status

let currentStatus = "pending";


// Store all tasks

let allTasks = [];


// ==================================================
// LOAD TASKS
// ==================================================

async function loadTasks() {

    try {

        const response =
            await fetch(API);


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                "Failed to load tasks"
            );

        }


        allTasks =
            result.data || [];


        displayTasks();


    } catch (error) {

        console.error(
            "Load tasks error:",
            error
        );


        alert(
            "Unable to load tasks."
        );

    }

}


// ==================================================
// GET STATUS NAME
// ==================================================

function getStatusName(status) {

    if (status === "pending") {

        return "Pending";

    }


    if (status === "in-progress") {

        return "In Progress";

    }


    if (status === "completed") {

        return "Completed";

    }


    return "Pending";

}


// ==================================================
// GET ACTUAL TASK STATUS
// Handles old tasks
// ==================================================

function getTaskStatus(task) {

    if (task.status) {

        return task.status;

    }


    // Old task

    if (task.completed === true) {

        return "completed";

    }


    return "pending";

}


// ==================================================
// DISPLAY TASKS
// ==================================================

function displayTasks() {

    const table =
        document.getElementById(
            "taskTable"
        );


    table.innerHTML = "";


    const filteredTasks =
        allTasks.filter(task => {

            return (
                getTaskStatus(task) ===
                currentStatus
            );

        });


    if (
        filteredTasks.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td colspan="4">

                    No
                    ${getStatusName(
                        currentStatus
                    )}
                    Tasks Available

                </td>

            </tr>

        `;

        updateDownloadButton();

        return;

    }


    filteredTasks.forEach(
        (task, index) => {

            const status =
                getTaskStatus(task);


            table.innerHTML += `

                <tr>

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${task.title}
                    </td>

                    <td>

                        <span
                            class="status ${status}"
                        >

                            ${getStatusName(
                                status
                            )}

                        </span>

                    </td>

                    <td>

                        <button
                            class="update-btn"
                            onclick="editTask(
                                '${task._id}'
                            )"
                        >

                            <i
                                class="fa-solid fa-pen"
                            ></i>

                            Update

                        </button>


                        <button
                            class="delete-btn"
                            onclick="deleteTask(
                                '${task._id}'
                            )"
                        >

                            <i
                                class="fa-solid fa-trash"
                            ></i>

                            Delete

                        </button>

                    </td>

                </tr>

            `;

        }
    );


    updateDownloadButton();

}


// ==================================================
// FILTER
// ==================================================

function filterTasks(status) {

    currentStatus =
        status;


    updateActiveButton();


    displayTasks();

}


// ==================================================
// ACTIVE BUTTON
// ==================================================

function updateActiveButton() {

    const buttons = [

        "pendingBtn",

        "inProgressBtn",

        "completedBtn",

    ];


    buttons.forEach(id => {

        const button =
            document.getElementById(id);


        if (button) {

            button.classList.remove(
                "active"
            );

        }

    });


    if (
        currentStatus ===
        "pending"
    ) {

        document
            .getElementById(
                "pendingBtn"
            )
            .classList.add(
                "active"
            );

    }


    if (
        currentStatus ===
        "in-progress"
    ) {

        document
            .getElementById(
                "inProgressBtn"
            )
            .classList.add(
                "active"
            );

    }


    if (
        currentStatus ===
        "completed"
    ) {

        document
            .getElementById(
                "completedBtn"
            )
            .classList.add(
                "active"
            );

    }

}


// ==================================================
// DOWNLOAD BUTTON
// ==================================================

function updateDownloadButton() {

    const button =
        document.getElementById(
            "downloadPdfBtn"
        );


    if (!button) {

        return;

    }


    button.innerHTML = `

        <i class="fa-solid fa-file-pdf"></i>

        Download
        ${getStatusName(
            currentStatus
        )}
        Tasks PDF

    `;

}


// ==================================================
// DOWNLOAD PDF
// ==================================================

function downloadCurrentStatusPDF() {

    const url =
        `${API}/download/${currentStatus}`;


    window.location.href =
        url;

}


// ==================================================
// ADD TASK
// ==================================================

async function addTask() {

    const titleInput =
        document.getElementById(
            "title"
        );


    const statusInput =
        document.getElementById(
            "status"
        );


    const title =
        titleInput.value.trim();


    const status =
        statusInput.value;


    if (!title) {

        alert(
            "Please enter a task title."
        );

        return;

    }


    try {

        const response =
            await fetch(
                API,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                    },

                    body:
                        JSON.stringify({

                            title:

                                title,

                            status:

                                status,

                        }),

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            alert(
                result.message ||
                "Failed to add task."
            );

            return;

        }


        alert(
            "Task created successfully."
        );


        titleInput.value = "";


        statusInput.value =
            "pending";


        await loadTasks();


        // Show status where
        // task was added

        filterTasks(status);


    } catch (error) {

        console.error(
            "Add task error:",
            error
        );


        alert(
            "Failed to add task."
        );

    }

}


// ==================================================
// UPDATE TASK
// ==================================================

async function editTask(id) {

    const task =
        allTasks.find(
            item =>
                item._id === id
        );


    if (!task) {

        alert(
            "Task not found."
        );

        return;

    }


    const title =
        prompt(
            "Enter Updated Task Title:",
            task.title
        );


    if (title === null) {

        return;

    }


    if (!title.trim()) {

        alert(
            "Task title cannot be empty."
        );

        return;

    }


    const choice =
        prompt(

            "Select Status:\n\n" +

            "1. Pending\n" +

            "2. In Progress\n" +

            "3. Completed\n\n" +

            "Enter 1, 2 or 3:",

            getStatusNumber(
                getTaskStatus(task)
            )

        );


    if (choice === null) {

        return;

    }


    let status;


    if (choice === "1") {

        status = "pending";

    }

    else if (choice === "2") {

        status = "in-progress";

    }

    else if (choice === "3") {

        status = "completed";

    }

    else {

        alert(
            "Invalid status."
        );

        return;

    }


    try {

        const response =
            await fetch(
                `${API}/${id}`,
                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json",

                    },

                    body:
                        JSON.stringify({

                            title:
                                title.trim(),

                            status:
                                status,

                        }),

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            alert(
                result.message ||
                "Failed to update task."
            );

            return;

        }


        alert(
            "Task updated successfully."
        );


        await loadTasks();


        filterTasks(status);


    } catch (error) {

        console.error(
            "Update task error:",
            error
        );


        alert(
            "Failed to update task."
        );

    }

}


// ==================================================
// STATUS NUMBER
// ==================================================

function getStatusNumber(status) {

    if (status === "pending") {

        return "1";

    }


    if (status === "in-progress") {

        return "2";

    }


    if (status === "completed") {

        return "3";

    }


    return "1";

}


// ==================================================
// DELETE TASK
// ==================================================

async function deleteTask(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this task?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                `${API}/${id}`,
                {

                    method: "DELETE",

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            alert(
                result.message ||
                "Failed to delete task."
            );

            return;

        }


        alert(
            "Task deleted successfully."
        );


        await loadTasks();


    } catch (error) {

        console.error(
            "Delete error:",
            error
        );


        alert(
            "Failed to delete task."
        );

    }

}


// ==================================================
// PAGE LOAD
// ==================================================

window.addEventListener(
    "DOMContentLoaded",
    () => {

        currentStatus =
            "pending";


        updateActiveButton();


        updateDownloadButton();


        loadTasks();

    }
);