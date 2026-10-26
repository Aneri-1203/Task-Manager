// Ensure environment variables are loaded even if this service is imported standalone
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

// ============================================================================
// AI TASK DESCRIPTION SERVICE (Google Gemini API & Local Demo Mode)
// Practical 13: AI API Integration into a Web Application
// ============================================================================

/**
 * Generate a realistic, contextual sample description locally when AI_DEMO_MODE=true.
 * Provides an offline demonstration mode without paid API requirements.
 *
 * @param {string} title - Task title
 * @returns {string} Contextual sample description
 */
function generateLocalDemoDescription(title) {
    const lower = title.toLowerCase();

    if (lower.includes("dbms") || lower.includes("database") || lower.includes("sql") || lower.includes("mongo")) {
        return `Complete the database tasks for "${title}" by designing the schema, executing the required queries or migrations, and verifying data consistency and query outputs before submission.`;
    }

    if (lower.includes("practical") || lower.includes("file") || lower.includes("lab") || lower.includes("assignment")) {
        return `Complete the practical documentation for "${title}" by writing experiment procedures, documenting observed outputs, and verifying all submission criteria against laboratory guidelines.`;
    }

    if (lower.includes("ci") || lower.includes("pipeline") || lower.includes("action") || lower.includes("deploy")) {
        return `Configure and validate the CI/CD pipeline for "${title}" by setting up workflow steps, executing automated tests, and confirming build and deployment status.`;
    }

    if (lower.includes("docker") || lower.includes("container") || lower.includes("compose")) {
        return `Build and verify the containerization environment for "${title}" by configuring the Dockerfile and docker-compose settings, checking service orchestration, and testing port bindings.`;
    }

    if (lower.includes("test") || lower.includes("jest") || lower.includes("supertest") || lower.includes("bug") || lower.includes("fix")) {
        return `Execute comprehensive testing for "${title}" by drafting test cases, validating edge scenarios, and confirming that all integration tests pass with expected assertions.`;
    }

    if (lower.includes("frontend") || lower.includes("react") || lower.includes("ui") || lower.includes("css") || lower.includes("component")) {
        return `Develop and refine the user interface for "${title}" by implementing responsive components, linking API state handlers, and testing visual styling across device viewports.`;
    }

    if (lower.includes("auth") || lower.includes("login") || lower.includes("jwt") || lower.includes("password")) {
        return `Implement and test security controls for "${title}" by verifying token generation, session persistence, role-based authorization guards, and input validation.`;
    }

    // Default high-quality contextual template
    return `Complete the key deliverables for "${title}" by outlining required implementation steps, coordinating necessary resources, and reviewing final deliverables before completion.`;
}

/**
 * Initialize the Google Gen AI client safely using environment configuration.
 * Returns null if the API key is missing or set to a placeholder.
 */
function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_key_here" || apiKey === "your_gemini_api_key_here" || !apiKey.trim()) {
        return null;
    }

    return new GoogleGenAI({
        apiKey: apiKey.trim(),
    });
}

/**
 * Safely inspect and sanitize Gemini error objects without exposing API keys.
 * Unpacks nested JSON error strings commonly returned by Google's REST endpoints.
 *
 * @param {Error|any} error - Error thrown by Google Gen AI SDK
 * @returns {{status: number, code: string, sanitizedMessage: string}} Normalized, sanitized error details
 */
function parseGeminiError(error) {
    let status = error.status || error.statusCode;
    let code = error.code || "unknown_code";
    let rawMessage = error.message || "Unknown Gemini API provider error";

    // Unpack nested JSON error message if returned as a string: {"error": {"code": 403, "message": "...", "status": "PERMISSION_DENIED"}}
    if (typeof rawMessage === "string" && rawMessage.trim().startsWith("{")) {
        try {
            const parsedJson = JSON.parse(rawMessage);
            if (parsedJson.error) {
                if (parsedJson.error.code) status = Number(parsedJson.error.code);
                if (parsedJson.error.status) code = String(parsedJson.error.status);
                if (parsedJson.error.message) rawMessage = String(parsedJson.error.message);
            }
        } catch (_) {
            // Not valid JSON, keep as raw message
        }
    }

    // Extract status code from message string if not explicitly attached
    if (!status) {
        const statusMatch = String(rawMessage).match(/\b(400|401|403|404|429|500|503|504)\b/);
        status = statusMatch ? parseInt(statusMatch[1], 10) : 503;
    }

    // Sanitize any API key formats (Google AIza..., AQ...., OpenAI sk-..., or key=...)
    const sanitizedMessage = String(rawMessage)
        .replace(/AIza[0-9A-Za-z\-_]{25,}/g, "AIza***")
        .replace(/AQ\.[0-9A-Za-z\-_]{25,}/g, "AQ.***")
        .replace(/sk-[a-zA-Z0-9_\-]{20,}/g, "sk-***")
        .replace(/key=[a-zA-Z0-9_\-]{15,}/g, "key=***")
        .replace(/api[-_]?key[:=]\s*['"]?[a-zA-Z0-9_\-]+['"]?/gi, "apiKey: ***");

    return {
        status,
        code,
        sanitizedMessage,
    };
}

/**
 * Classify Gemini provider errors into distinct, actionable categories:
 * 1. Invalid Credentials (401 / 400 API_KEY_INVALID)
 * 2. Permission / Project Restrictions (403 PERMISSION_DENIED / Free tier unavailable)
 * 3. Unavailable / Retired Models (404 NOT_FOUND)
 * 4. Quota or Rate Limits (429 RESOURCE_EXHAUSTED)
 * 5. Timeouts (504 DEADLINE_EXCEEDED)
 *
 * @param {object} parsed - Sanitized error details from parseGeminiError
 * @returns {{category: string, userMessage: string, statusCode: number}}
 */
function classifyGeminiError(parsed) {
    const { status, code, sanitizedMessage } = parsed;
    const lowerMessage = sanitizedMessage.toLowerCase();
    const lowerCode = String(code).toLowerCase();

    // 1. Quota or Rate Limit Exceeded (429 / RESOURCE_EXHAUSTED)
    if (
        status === 429 ||
        lowerCode.includes("resource_exhausted") ||
        lowerMessage.includes("resource_exhausted") ||
        lowerMessage.includes("quota exceeded") ||
        lowerMessage.includes("rate limit") ||
        lowerMessage.includes("too many requests")
    ) {
        console.error(
            `[Gemini AI Service Error] [QUOTA_OR_RATE_LIMIT] Status: 429 | Code: ${code} | Message: ${sanitizedMessage}`
        );
        return {
            category: "QUOTA_OR_RATE_LIMIT",
            userMessage:
                "Gemini API rate limit or free tier quota reached. Please wait a few moments before retrying, or enter the description manually.",
            statusCode: 429,
        };
    }

    // 2. Permission or Project Restrictions (403 / PERMISSION_DENIED)
    if (
        status === 403 ||
        lowerCode.includes("permission_denied") ||
        lowerMessage.includes("permission_denied") ||
        lowerMessage.includes("free tier is not available for this project") ||
        lowerMessage.includes("billing to upgrade")
    ) {
        console.error(
            `[Gemini AI Service Error] [PROJECT_OR_PERMISSION_RESTRICTION] Status: 403 | Code: ${code} | Message: ${sanitizedMessage}`
        );

        if (lowerMessage.includes("free tier is not available for this project")) {
            return {
                category: "PROJECT_RESTRICTION",
                userMessage:
                    "The Gemini API free tier is not available for this Google Cloud project. To run without paid access, set AI_DEMO_MODE=true in .env, or enter the description manually.",
                statusCode: 403,
            };
        }

        return {
            category: "PERMISSION_RESTRICTION",
            userMessage:
                "Gemini API permission denied for this project. Check your Google Cloud project settings and API permissions, or enter the description manually.",
            statusCode: 403,
        };
    }

    // 3. Invalid Credentials / Authentication Failure (401 / 400 API_KEY_INVALID)
    if (
        status === 401 ||
        lowerCode.includes("unauthenticated") ||
        lowerMessage.includes("api_key_invalid") ||
        lowerMessage.includes("api key not valid") ||
        lowerMessage.includes("unauthenticated")
    ) {
        console.error(
            `[Gemini AI Service Error] [AUTH_ERROR] Status: ${status} | Code: ${code} | Message: ${sanitizedMessage}`
        );
        return {
            category: "AUTH_ERROR",
            userMessage:
                "Gemini API authentication failed. The provided GEMINI_API_KEY is invalid or unrecognized. Please verify your key in .env or enter the description manually.",
            statusCode: 401,
        };
    }

    // 4. Model Not Found or Retired (404)
    if (status === 404 || lowerMessage.includes("not found") || lowerMessage.includes("no longer available")) {
        console.error(
            `[Gemini AI Service Error] [MODEL_NOT_FOUND] Status: 404 | Code: ${code} | Message: ${sanitizedMessage}`
        );
        return {
            category: "MODEL_NOT_FOUND",
            userMessage:
                "The configured Gemini model was not found or is no longer available. Please check GEMINI_MODEL in .env or enter the description manually.",
            statusCode: 404,
        };
    }

    // 5. Timeout / Deadline Exceeded (504)
    if (status === 504 || lowerMessage.includes("deadline_exceeded") || lowerMessage.includes("timeout")) {
        console.error(
            `[Gemini AI Service Error] [TIMEOUT] Status: 504 | Code: ${code} | Message: ${sanitizedMessage}`
        );
        return {
            category: "TIMEOUT",
            userMessage: "Gemini API request timed out. Please enter the description manually.",
            statusCode: 504,
        };
    }

    // 6. Generic Provider Failure
    console.error(
        `[Gemini AI Service Error] [PROVIDER_ERROR] Status: ${status} | Code: ${code} | Message: ${sanitizedMessage}`
    );
    return {
        category: "PROVIDER_ERROR",
        userMessage: "AI suggestions are temporarily unavailable. Please enter the description manually.",
        statusCode: 503,
    };
}

/**
 * Generate a concise, context-aware task description based on a task title.
 * Supports:
 * 1. AI_DEMO_MODE=true: Local generation without paid external API calls.
 * 2. Live Google Gemini API: When a valid key and authorized project are configured.
 *
 * @param {string} title - The task title provided by the user
 * @returns {Promise<{success: boolean, description: string, fallback: boolean, demo?: boolean, source?: string, statusCode?: number, message?: string, errorCategory?: string, errorCode?: string}>}
 */
async function generateTaskDescription(title) {
    const isDemoMode = process.env.AI_DEMO_MODE === "true" || process.env.AI_DEMO_MODE === "1";

    // 1. DEMO MODE (Local generation, clearly labeled, no external calls or costs)
    if (isDemoMode) {
        console.log(`[AI Service] AI Demo Mode Active: Generating local sample description for "${title.trim()}"`);
        const demoDescription = generateLocalDemoDescription(title.trim());

        return {
            success: true,
            description: demoDescription,
            fallback: false,
            demo: true,
            source: "demo",
            message: "Demo mode: Locally generated task description suggestion (Offline Demonstration).",
        };
    }

    // 2. LIVE GEMINI API MODE
    const client = getGeminiClient();

    // Graceful degradation when API key is not configured
    if (!client) {
        console.warn("[Gemini AI Service] GEMINI_API_KEY is missing or placeholder. Falling back gracefully.");
        return {
            success: false,
            description: "",
            fallback: true,
            statusCode: 503,
            errorCategory: "MISSING_CREDENTIALS",
            errorCode: "missing_api_key",
            message: "Gemini API key is not configured. Set GEMINI_API_KEY in the backend .env file, enable AI_DEMO_MODE=true, or enter the description manually.",
        };
    }

    // Model selection with safe fallback
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    try {
        const response = await client.models.generateContent({
            model,
            contents: `Task title: "${title.trim()}"`,
            config: {
                systemInstruction:
                    "You are a helpful assistant for a task management application. Given a task title, generate a concise, realistic, single-paragraph description (2-3 sentences) detailing the key deliverables, action items, or steps to complete it. Do not include quotes, markdown headers, or bullet lists; output plain descriptive text only.",
                maxOutputTokens: 160,
                temperature: 0.7,
            },
        });

        // Extract generated text from SDK response
        const generatedText = (response.text || "").trim();

        if (!generatedText) {
            return {
                success: false,
                description: "",
                fallback: true,
                statusCode: 502,
                errorCategory: "EMPTY_RESPONSE",
                errorCode: "empty_content",
                message: "AI suggestions are temporarily unavailable. Please enter the description manually.",
            };
        }

        return {
            success: true,
            description: generatedText,
            fallback: false,
            demo: false,
            source: "gemini",
        };
    } catch (error) {
        // Safely parse and categorize the Gemini error without leaking sensitive credentials
        const parsed = parseGeminiError(error);
        const classification = classifyGeminiError(parsed);

        return {
            success: false,
            description: "",
            fallback: true,
            statusCode: classification.statusCode,
            errorCategory: classification.category,
            errorCode: parsed.code,
            message: classification.userMessage,
        };
    }
}

module.exports = {
    getGeminiClient,
    generateTaskDescription,
    generateLocalDemoDescription,
    parseGeminiError,
    classifyGeminiError,
};
