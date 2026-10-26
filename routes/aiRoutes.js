const express = require("express");
const router = express.Router();

const { generateDescription } = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");
const { aiRateLimiter } = require("../middleware/aiRateLimiter");

// ============================================================================
// AI ROUTES
// Practical 13: AI API Integration into a Web Application
// Base Path: /api/ai
// ============================================================================

// POST /api/ai/generate-description
// Protected by JWT authentication and rate limiter
router.post("/generate-description", authMiddleware, aiRateLimiter, generateDescription);

module.exports = router;
