const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { sendPasswordResetEmail } = require("../services/emailService");

const ADMIN_EMAILS = [
    "24aiml031@charusat.edu.in",
];

// ==================================================
// Helper: Generate JWT Token
// ==================================================

const generateToken = (user) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error("JWT_SECRET is missing from .env");
    }

    const email = (user.email || "").toLowerCase();
    const role = ADMIN_EMAILS.includes(email)
        ? "admin"
        : (user.role || "employee");

    return jwt.sign(
        {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            role,
        },
        jwtSecret,
        { expiresIn: "1d" }
    );
};

// ==================================================
// POST /auth/register
// Create New User
// ==================================================

const registerUser = async (req, res, next) => {
    try {
        const { username, email, password, role } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email and password are required",
            });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanUsername.length < 3) {
            return res.status(400).json({
                success: false,
                message: "Username must contain at least 3 characters",
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters",
            });
        }

        const existingUsername = await User.findOne({ username: cleanUsername });
        if (existingUsername) {
            return res.status(409).json({
                success: false,
                message: "Username already exists",
            });
        }

        const existingEmail = await User.findOne({ email: cleanEmail });
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: "Email already registered",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const allowedRoles = ["admin", "manager", "employee", "user"];
        const userRole = allowedRoles.includes(role) ? (role === "user" ? "employee" : role) : "employee";

        const user = await User.create({
            username: cleanUsername,
            email: cleanEmail,
            password: hashedPassword,
            role: userRole,
            manager: req.body.managerId || null,
            authProvider: "local",
            lastLogin: new Date(),
        });

        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                manager: user.manager,
                lastLogin: user.lastLogin,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================
// POST /auth/login
// Login User
// ==================================================

const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required.",
            });
        }

        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: cleanEmail }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        if (!user.password) {
            return res.status(400).json({
                success: false,
                message: "This account has no password set. If you registered with Google, use Continue with Google.",
            });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        if (ADMIN_EMAILS.includes(cleanEmail)) {
            user.role = "admin";
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                role: ADMIN_EMAILS.includes(cleanEmail) ? "admin" : (user.role || "employee"),
                authProvider: user.authProvider || "local",
                profilePicture: user.profilePicture || "",
                lastLogin: user.lastLogin,
            },
        });
    } catch (error) {
        console.error("Email login error:", error);
        next(error);
    }
};

// ==================================================
// GET /auth/me
// Get Current Logged-in User
// ==================================================

const getCurrentUser = async (req, res, next) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const isSpecialAdmin = ADMIN_EMAILS.includes((user.email || "").toLowerCase());
        if (isSpecialAdmin && user.role !== "admin") {
            user.role = "admin";
            await user.save();
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role || "user",
                authProvider: user.authProvider,
                profilePicture: user.profilePicture,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================
// POST /auth/logout
// Logout User
// ==================================================

const logoutUser = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================
// Google Login / Registration via Google Identity Services
// POST /auth/google
// ==================================================

const googleLogin = async (req, res, next) => {
    try {
        const { credential } = req.body || {};

        if (typeof credential !== "string" || !credential.trim()) {
            return res.status(400).json({
                success: false,
                message: "A Google ID credential is required.",
            });
        }

        const googleClientId = process.env.GOOGLE_CLIENT_ID;
        if (!googleClientId || googleClientId.includes("your_google_client_id")) {
            return res.status(500).json({
                success: false,
                message: "Google login is not configured on the server.",
            });
        }

        const client = new OAuth2Client(googleClientId);
        let payload;

        try {
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: googleClientId,
            });
            payload = ticket.getPayload();
        } catch (verificationError) {
            console.error("Google credential verification failed:", verificationError.message);
            return res.status(401).json({
                success: false,
                message: "Google sign-in failed. Please try again.",
            });
        }

        if (!payload || !payload.sub || !payload.email || payload.email_verified !== true) {
            return res.status(401).json({
                success: false,
                message: "Google account verification failed.",
            });
        }

        const googleId = payload.sub;
        const email = payload.email.trim().toLowerCase();
        const name = payload.name || payload.given_name || email.split("@")[0];
        const picture = payload.picture || "";
        const isAdmin = ADMIN_EMAILS.includes(email);

        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (user) {
            if (user.googleId && user.googleId !== googleId) {
                return res.status(409).json({
                    success: false,
                    message: "This email is already linked to another Google account.",
                });
            }

            user.googleId = googleId;
            if (picture) user.profilePicture = picture;
            if (!user.authProvider) user.authProvider = "google";
            if (isAdmin) user.role = "admin";
            else if (!user.role) user.role = "employee";
            user.lastLogin = new Date();
            await user.save();
        } else {
            let baseUsername = name.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
            if (baseUsername.length < 3) {
                baseUsername = `user_${Date.now().toString().slice(-6)}`;
            }

            let username = baseUsername;
            let counter = 1;
            while (await User.findOne({ username })) {
                username = `${baseUsername}_${counter}`;
                counter++;
            }

            user = await User.create({
                username,
                email,
                authProvider: "google",
                googleId,
                profilePicture: picture,
                role: isAdmin ? "admin" : "employee",
                lastLogin: new Date(),
            });
        }

        const token = generateToken(user);
        return res.status(200).json({
            success: true,
            message: "Google login successful.",
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                role: isAdmin ? "admin" : (user.role || "employee"),
                authProvider: user.authProvider,
                profilePicture: user.profilePicture || "",
                lastLogin: user.lastLogin,
            },
        });
    } catch (error) {
        console.error("Google login error:", error);
        next(error);
    }
};

// ==================================================
// GET /auth/google/client-id
// ==================================================

const getGoogleClientId = (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const configured = clientId.length > 0 && !clientId.includes("your_google_client_id");

    return res.status(200).json({
        success: true,
        clientId: configured ? clientId : "",
        configured,
    });
};

// ==================================================
// POST /auth/forgot-password
// Request Password Reset Link
// ==================================================

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address.",
            });
        }

        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If an account with that email exists, password reset instructions have been sent.",
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const protocol = req.protocol;
        const host = req.get("host");
        const resetUrl = `${protocol}://${host}/reset-password.html?token=${resetToken}`;

        await sendPasswordResetEmail(user, resetUrl);

        res.status(200).json({
            success: true,
            message: "Password reset instructions have been sent to your email.",
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================
// POST /auth/reset-password
// Reset Password With Token
// ==================================================

const resetPassword = async (req, res, next) => {
    try {
        const { token, password, newPassword } = req.body;
        const passToSet = password || newPassword;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Reset token is required.",
            });
        }

        if (!passToSet || passToSet.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must contain at least 6 characters.",
            });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        }).select("+resetPasswordToken +resetPasswordExpires");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Password reset token is invalid or has expired.",
            });
        }

        const hashedPassword = await bcrypt.hash(passToSet, 12);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password reset successfully! You can now login with your new password.",
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================
// GET /auth/users
// Get Users / Employees List for Task Assignment (RBAC)
// ==================================================

const getUsersList = async (req, res, next) => {
    try {
        const currentUserRole = req.user.role || "employee";
        let query = {};

        if (currentUserRole === "admin") {
            query = {};
        } else if (currentUserRole === "manager") {
            query = {
                $or: [
                    { manager: req.user._id },
                    { role: { $in: ["employee", "user"] } },
                    { _id: req.user._id },
                ],
            };
        } else {
            query = {
                $or: [
                    { _id: req.user._id },
                    { role: { $in: ["manager", "admin"] } },
                ],
            };
        }

        const users = await User.find(query)
            .select("_id username email role manager profilePicture lastLogin createdAt")
            .populate("manager", "username email role")
            .sort({ role: 1, username: 1 });

        res.status(200).json({
            success: true,
            count: users.length,
            users,
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================
// PUT /auth/users/:id/role
// Admin updates user role or assigns manager
// ==================================================

const updateUserRoleOrManager = async (req, res, next) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Administrators can modify user roles and team hierarchy.",
            });
        }

        const { role, managerId } = req.body;
        const targetUserId = req.params.id;

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (role && ["admin", "manager", "employee", "user"].includes(role)) {
            targetUser.role = role === "user" ? "employee" : role;
        }

        if (managerId !== undefined) {
            targetUser.manager = managerId || null;
        }

        await targetUser.save();

        const updatedUser = await User.findById(targetUserId)
            .select("_id username email role manager profilePicture")
            .populate("manager", "username email");

        res.status(200).json({
            success: true,
            message: "User updated successfully.",
            user: updatedUser,
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================
// GET /auth/verify-session
// Check Session Active Status & Token Validity
// ==================================================

const verifySession = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                sessionValid: false,
                message: "Session is not active or has expired.",
            });
        }

        res.status(200).json({
            success: true,
            sessionValid: true,
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role || "employee",
                lastLogin: req.user.lastLogin,
            },
            serverTime: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
};

// ==================================================
// Export Controllers
// ==================================================

module.exports = {
    registerUser,
    loginUser,
    getCurrentUser,
    logoutUser,
    googleLogin,
    getGoogleClientId,
    forgotPassword,
    resetPassword,
    getUsersList,
    updateUserRoleOrManager,
    verifySession,
};
