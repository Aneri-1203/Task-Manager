const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            trim: true,
            minlength: [3, "Username must contain at least 3 characters"],
            maxlength: [30, "Username cannot exceed 30 characters"],
            unique: true,
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            trim: true,
            lowercase: true,
            unique: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                "Please enter a valid email address",
            ],
        },

        password: {
            type: String,
            required: function () {
                return this.authProvider === "local";
            },
            minlength: [6, "Password must contain at least 6 characters"],
            select: false,
        },

        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local",
        },

        googleId: {
            type: String,
            default: null,
            sparse: true,
        },

        profilePicture: {
            type: String,
            default: "",
        },

        role: {
            type: String,
            enum: ["admin", "manager", "employee", "user"],
            default: "employee",
        },

        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        resetPasswordToken: {
            type: String,
            default: null,
            select: false,
        },

        resetPasswordExpires: {
            type: Date,
            default: null,
            select: false,
        },

        lastLogin: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

userSchema.pre("save", function (next) {
    if (this.username) {
        this.username = this.username.trim();
    }

    if (this.email) {
        this.email = this.email.trim().toLowerCase();
    }

    next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;