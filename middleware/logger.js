// middleware/logger.js

const fs = require("fs");
const path = require("path");

// Path to logs directory
const logsDir = path.join(__dirname, "../logs");

// Create logs directory if it does not exist
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Path to log file
const logFile = path.join(logsDir, "server.log");

console.log(`Log file: ${logFile}`);

// Logger middleware
const logger = (req, res, next) => {
    const time = new Date().toISOString();

    const log = `${time} | ${req.method} | ${req.originalUrl} | IP: ${req.ip}\n`;

    // Display log in terminal
    console.log(log.trim());

    // Save log to server.log
    fs.appendFile(logFile, log, (err) => {
        if (err) {
            console.error("Failed to write log:", err.message);
        }
    });

    next();
};

module.exports = logger;