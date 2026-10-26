const { generateTaskDescription } = require("../services/aiService");

// ============================================================================
// AI CONTROLLER
// Practical 13: AI API Integration into a Web Application
// ============================================================================

/**
 * Handle POST /api/ai/generate-description
 * Validates the task title, calls the AI service, and returns an editable suggestion.
 */
const generateDescription = async (req, res, next) => {
    try {
        const { title } = req.body || {};

        // 1. Input Validation
        if (!title || typeof title !== "string") {
            return res.status(400).json({
                success: false,
                fallback: false,
                message: "Task title is required and must be a valid string.",
            });
        }

        const trimmedTitle = title.trim();

        if (trimmedTitle.length < 3) {
            return res.status(400).json({
                success: false,
                fallback: false,
                message: "Task title must be at least 3 characters long.",
            });
        }

        if (trimmedTitle.length > 150) {
            return res.status(400).json({
                success: false,
                fallback: false,
                message: "Task title cannot exceed 150 characters.",
            });
        }

        // 2. Delegate to AI Service (supports both Live Gemini and AI_DEMO_MODE)
        const result = await generateTaskDescription(trimmedTitle);

        if (!result.success) {
            return res.status(result.statusCode || 503).json({
                success: false,
                description: "",
                fallback: true,
                errorCategory: result.errorCategory || "PROVIDER_ERROR",
                errorCode: result.errorCode || "unknown",
                retryAfter: result.retryAfter || null,
                message: result.message || "AI suggestions are temporarily unavailable. Please enter the description manually.",
            });
        }

        // 3. Return generated description suggestion
        return res.status(200).json({
            success: true,
            description: result.description,
            fallback: false,
            demo: result.demo || false,
            source: result.source || "gemini",
            message: result.message || null,
        });
    } catch (error) {
        console.error("[AI Controller Error]", error.message);
        return res.status(500).json({
            success: false,
            description: "",
            fallback: true,
            errorCategory: "INTERNAL_ERROR",
            errorCode: "internal_server_error",
            message: "An internal server error occurred while generating the suggestion. Please enter the description manually.",
        });
    }
};

module.exports = {
    generateDescription,
};
