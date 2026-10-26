const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        // ==========================================
        // Task Owner / Creator
        // ==========================================

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Task user is required"],
        },

        // ==========================================
        // Assigned To (Employee / User)
        // ==========================================

        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // ==========================================
        // Assigned By (Admin / Manager)
        // ==========================================

        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // ==========================================
        // Task Title
        // ==========================================

        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            minlength: [1, "Title cannot be empty"],
        },

        // ==========================================
        // Description
        // ==========================================

        description: {
            type: String,
            default: "",
            trim: true,
        },

        // ==========================================
        // Status
        // ==========================================

        status: {
            type: String,

            enum: {
                values: [
                    "pending",
                    "in-progress",
                    "completed",
                ],

                message:
                    "Status must be pending, in-progress, or completed",
            },

            default: "pending",
        },

        // ==========================================
        // Old Completed Field
        // ==========================================

        completed: {
            type: Boolean,
            default: false,
        },

        // ==========================================
        // Priority
        // ==========================================

        priority: {
            type: String,

            enum: {
                values: [
                    "low",
                    "medium",
                    "high",
                ],

                message:
                    "Priority must be low, medium, or high",
            },

            default: "medium",
        },
    },

    {
        timestamps: true,
        versionKey: false,
    }
);


// ==================================================
// Pre Save
// ==================================================

taskSchema.pre("save", function (next) {

    if (this.title) {
        this.title = this.title.trim();
    }

    if (this.description) {
        this.description = this.description.trim();
    }

    this.completed =
        this.status === "completed";

    next();
});


// ==================================================
// Pre Update
// ==================================================

taskSchema.pre(
    "findOneAndUpdate",
    function (next) {

        const update = this.getUpdate();

        if (update.status !== undefined) {

            update.completed =
                update.status === "completed";

        } else if (
            update.completed !== undefined
        ) {

            update.status =
                update.completed
                    ? "completed"
                    : "pending";
        }

        next();
    }
);


const Task =
    mongoose.model("Task", taskSchema);

module.exports = Task;