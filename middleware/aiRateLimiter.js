const crypto = require("crypto");

// ============================================================================
// AI RATE LIMITER MIDDLEWARE (In-Memory Cooldown)
// Practical 13: Rate Limiting to Protect External AI API Resources
// ============================================================================

// Map storing SHA-256 hash(userId + ":" + normalizedTitle) -> timestamp of last accepted request
const titleCooldownMap = new Map();

// Map storing userId -> array of timestamps for rolling 1-minute window
const userRequestMap = new Map();

const TITLE_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown for same title
const MAX_REQUESTS_PER_MINUTE = 10;   // Max 10 requests per user per minute

/**
 * Normalize a task title consistently by trimming whitespace and converting to lowercase.
 *
 * @param {string} rawTitle - Raw title from request body
 * @returns {string} Normalized title string
 */
function normalizeTitle(rawTitle) {
    if (typeof rawTitle !== "string") return "";
    return rawTitle.trim().toLowerCase();
}

/**
 * Clean up expired entries periodically to prevent memory accumulation.
 */
setInterval(() => {
    const now = Date.now();

    for (const [key, timestamp] of titleCooldownMap.entries()) {
        if (now - timestamp > TITLE_COOLDOWN_MS) {
            titleCooldownMap.delete(key);
        }
    }

    for (const [userId, timestamps] of userRequestMap.entries()) {
        const validTimestamps = timestamps.filter((t) => now - t < 60000);
        if (validTimestamps.length === 0) {
            userRequestMap.delete(userId);
        } else {
            userRequestMap.set(userId, validTimestamps);
        }
    }
}, 120000).unref(); // unref prevents timer from keeping process alive in tests

/**
 * Rate limiter middleware for AI generation endpoint.
 *
 * Rules:
 * 1. Allow one request per task title every 60 seconds.
 * 2. Start cooldown only when a request is accepted, not when rejected.
 * 3. Calculate remaining seconds using stored timestamp vs current time.
 * 4. Do not reset or update timestamp on blocked requests.
 */
function aiRateLimiter(req, res, next) {
    const userId = req.user ? req.user._id.toString() : req.ip || "anonymous";
    const rawTitle = req.body && typeof req.body.title === "string" ? req.body.title : "";
    const normalizedTitle = normalizeTitle(rawTitle);

    // If title is missing or empty, skip rate limiting so controller can return 400 Bad Request
    if (!normalizedTitle) {
        return next();
    }

    const now = Date.now();

    // Create unique key based on user ID and normalized title
    const titleHash = crypto
        .createHash("sha256")
        .update(`${userId}:${normalizedTitle}`)
        .digest("hex");

    // 1. Check title-specific cooldown
    const lastAccepted = titleCooldownMap.get(titleHash);
    if (lastAccepted) {
        const elapsed = now - lastAccepted;
        if (elapsed < TITLE_COOLDOWN_MS) {
            // Calculate actual remaining seconds from stored timestamp
            const remainingSeconds = Math.max(1, Math.ceil((TITLE_COOLDOWN_MS - elapsed) / 1000));

            // Important: Do NOT update titleCooldownMap on blocked requests
            return res.status(429).json({
                success: false,
                fallback: true,
                remainingSeconds,
                message: `Rate limit reached. Please wait ${remainingSeconds}s before requesting another suggestion for this task title.`,
            });
        }
    }

    // 2. Check rolling per-user volume limit (max 10 requests / min)
    const userTimestamps = (userRequestMap.get(userId) || []).filter((t) => now - t < 60000);
    if (userTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
        return res.status(429).json({
            success: false,
            fallback: true,
            remainingSeconds: 60,
            message: "Too many AI generation requests. Please wait a minute before trying again.",
        });
    }

    // Provisionally record cooldown for this accepted request
    titleCooldownMap.set(titleHash, now);

    // Track user request timestamp
    userTimestamps.push(now);
    userRequestMap.set(userId, userTimestamps);

    // If the request is ultimately rejected (e.g. 400 validation error, 503 provider downtime),
    // remove the cooldown so the user is not penalized for a rejected request
    res.on("finish", () => {
        if (res.statusCode >= 400 && res.statusCode !== 429) {
            if (lastAccepted) {
                titleCooldownMap.set(titleHash, lastAccepted);
            } else {
                titleCooldownMap.delete(titleHash);
            }
        }
    });

    next();
}

/**
 * Clear in-memory rate limiter state (used in automated unit/integration tests).
 */
function resetRateLimiter() {
    titleCooldownMap.clear();
    userRequestMap.clear();
}

module.exports = {
    aiRateLimiter,
    resetRateLimiter,
    normalizeTitle,
    titleCooldownMap,
    TITLE_COOLDOWN_MS,
};
