// server.js

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
const logger = require("./middleware/logger");
const validateContentType = require("./middleware/validateContentType");

// Routes
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const aiRoutes = require("./routes/aiRoutes");

// Error handling middleware
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://mongodb:27017/taskdb";

// --------------------------------------------------
// Built-in Middleware
// --------------------------------------------------

app.use(express.json());

// Logger
app.use(logger);

// Content-Type validation
app.use(validateContentType);

// --------------------------------------------------
// Frontend (Serve Old Version from public/)
// --------------------------------------------------

const fs = require("fs");
const clientDistPath = path.join(__dirname, "client", "dist");

// Serve files from the public folder (Old Version)
app.use(express.static(path.join(__dirname, "public")));

// Mount React client under /app if built
if (fs.existsSync(clientDistPath)) {
    app.use("/app", express.static(clientDistPath));
}

// --------------------------------------------------
// API Routes
// --------------------------------------------------

// Authentication routes under /auth
app.use("/auth", authRoutes);

// All task APIs are available under /tasks
app.use("/tasks", taskRoutes);

// AI APIs under /api/ai (Practical 13)
app.use("/api/ai", aiRoutes);

// --------------------------------------------------
// Root Route
// --------------------------------------------------

// Open login page when visiting http://localhost:PORT/
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// --------------------------------------------------
// 404 Handler
// --------------------------------------------------

app.use(notFound);

// --------------------------------------------------
// Global Error Handler
// --------------------------------------------------

app.use(errorHandler);

// --------------------------------------------------
// MongoDB Connection
// --------------------------------------------------

if (require.main === module) {
    mongoose
        .connect(MONGO_URI)
        .then(() => {
            console.log("MongoDB connected successfully");

            app.listen(PORT, () => {
                console.log(`Server running on http://localhost:${PORT}`);
                console.log(`Network access: http://YOUR-PC-IP:${PORT}`);
                console.log(`Server available on your network at port ${PORT}`);
                console.log(`Frontend: http://localhost:5173 (run from client with npm run dev)`);
                console.log(`API: http://localhost:${PORT}/tasks`);
                console.log(`AI API: http://localhost:${PORT}/api/ai/generate-description`);
            });
        })
        .catch((error) => {
            console.error("MongoDB connection failed:", error.message);
            process.exit(1);
        });
}

module.exports = app;
