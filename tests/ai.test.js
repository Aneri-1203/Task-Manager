const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const crypto = require("crypto");

process.env.JWT_SECRET = process.env.JWT_SECRET || "ci_test_jwt_secret_key_98765";
process.env.NODE_ENV = "test";
process.env.PORT = "5098";
process.env.GEMINI_API_KEY = "test_mock_gemini_key";
process.env.GEMINI_MODEL = "gemini-2.5-flash";

// Mock User model for authentication
const User = require("../models/User");
jest.mock("../models/User");

// Mock @google/genai SDK so tests never make real external Google API calls
const mockGenerateContent = jest.fn();
jest.mock("@google/genai", () => {
    return {
        GoogleGenAI: jest.fn().mockImplementation(() => {
            return {
                models: {
                    generateContent: mockGenerateContent,
                },
            };
        }),
    };
});

const { resetRateLimiter, titleCooldownMap, normalizeTitle } = require("../middleware/aiRateLimiter");
const { parseGeminiError, classifyGeminiError } = require("../services/aiService");
const app = require("../server");

describe("Practical 13: Google Gemini AI Task Description Generator API Tests", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockUser = {
        _id: mockUserId,
        username: "gemini_tester",
        email: "geminitester@charusat.edu.in",
        role: "employee",
    };

    let authToken;

    beforeAll(() => {
        authToken = jwt.sign(
            { id: mockUserId, username: mockUser.username, email: mockUser.email, role: mockUser.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
    });

    beforeEach(() => {
        jest.clearAllMocks();
        resetRateLimiter();
        User.findById.mockResolvedValue(mockUser);
        process.env.GEMINI_API_KEY = "test_mock_gemini_key";
        delete process.env.AI_DEMO_MODE;
    });

    // -------------------------------------------------------------------------
    // TEST 1: Valid title generates description using Gemini
    // -------------------------------------------------------------------------
    it("should return HTTP 200 with generated description when Gemini provider succeeds", async () => {
        mockGenerateContent.mockResolvedValue({
            text: "Complete the DBMS practical file by writing the required experiments, adding SQL queries and their outputs, and checking the final document before submission.",
        });

        const res = await request(app)
            .post("/api/ai/generate-description")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ title: "Prepare DBMS practical file" });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("success", true);
        expect(res.body).toHaveProperty("fallback", false);
        expect(res.body.description).toContain("Complete the DBMS practical file");
        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    // -------------------------------------------------------------------------
    // TEST 1B: Offline Demo Mode (AI_DEMO_MODE=true) - Zero External API Calls
    // -------------------------------------------------------------------------
    describe("AI Demo Mode (Offline Demonstration)", () => {
        beforeEach(() => {
            process.env.AI_DEMO_MODE = "true";
        });

        afterEach(() => {
            delete process.env.AI_DEMO_MODE;
        });

        it("should return HTTP 200 with local demo description and never call Google Gemini SDK", async () => {
            const res = await request(app)
                .post("/api/ai/generate-description")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ title: "Setup GitHub Actions CI/CD Pipeline" });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("fallback", false);
            expect(res.body).toHaveProperty("demo", true);
            expect(res.body).toHaveProperty("source", "demo");
            expect(res.body.message).toContain("Demo mode");
            expect(res.body.description).toContain("CI/CD pipeline");

            // Critical: Ensure external Google Gemini API SDK was NEVER called
            expect(mockGenerateContent).not.toHaveBeenCalled();
        });

        it("should generate contextual descriptions for various topics in demo mode", async () => {
            const res = await request(app)
                .post("/api/ai/generate-description")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ title: "Configure Docker containers" });

            expect(res.statusCode).toBe(200);
            expect(res.body.demo).toBe(true);
            expect(res.body.description).toMatch(/docker/i);
            expect(mockGenerateContent).not.toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------------------------
    // TEST 2: Validation of title field
    // -------------------------------------------------------------------------
    it("should return HTTP 400 when title is missing or empty", async () => {
        const res = await request(app)
            .post("/api/ai/generate-description")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ title: "   " });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("success", false);
        expect(res.body.message).toMatch(/title must be at least 3 characters/i);
    });

    it("should return HTTP 400 when title is shorter than 3 characters", async () => {
        const res = await request(app)
            .post("/api/ai/generate-description")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ title: "ab" });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("success", false);
        expect(res.body.message).toMatch(/at least 3 characters/i);
    });

    // -------------------------------------------------------------------------
    // TEST 3: Authentication guard
    // -------------------------------------------------------------------------
    it("should return HTTP 401 when no token is provided", async () => {
        const res = await request(app)
            .post("/api/ai/generate-description")
            .send({ title: "Valid Title Here" });

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty("success", false);
    });

    // -------------------------------------------------------------------------
    // TEST 4: Missing Credentials
    // -------------------------------------------------------------------------
    it("should return HTTP 503 fallback when GEMINI_API_KEY is missing or placeholder", async () => {
        delete process.env.GEMINI_API_KEY;

        const res = await request(app)
            .post("/api/ai/generate-description")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ title: "Prepare DBMS practical file" });

        expect(res.statusCode).toBe(503);
        expect(res.body).toHaveProperty("fallback", true);
        expect(res.body.errorCategory).toBe("MISSING_CREDENTIALS");
        expect(res.body.message).toMatch(/not configured/i);
    });

    // -------------------------------------------------------------------------
    // TEST 5: Distinguishing Provider Errors (Auth vs Permission vs Quota vs Model)
    // -------------------------------------------------------------------------
    describe("Gemini Error Categorization", () => {
        it("should distinguish Invalid Credentials (401 / API_KEY_INVALID)", async () => {
            mockGenerateContent.mockRejectedValue({
                status: 401,
                message: "API key not valid. Please pass a valid API key. [API_KEY_INVALID]",
            });

            const res = await request(app)
                .post("/api/ai/generate-description")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ title: "Prepare DBMS practical file" });

            expect(res.statusCode).toBe(401);
            expect(res.body).toHaveProperty("fallback", true);
            expect(res.body.errorCategory).toBe("AUTH_ERROR");
            expect(res.body.message).toMatch(/authentication failed/i);
        });

        it("should distinguish Permission/Project Restrictions (403 / PERMISSION_DENIED)", async () => {
            mockGenerateContent.mockRejectedValue({
                status: 403,
                message: JSON.stringify({
                    error: {
                        code: 403,
                        message: "The Gemini API free tier is not available for this project. To use the Gemini API, please set up billing.",
                        status: "PERMISSION_DENIED",
                    },
                }),
            });

            const res = await request(app)
                .post("/api/ai/generate-description")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ title: "Prepare DBMS practical file" });

            expect(res.statusCode).toBe(403);
            expect(res.body).toHaveProperty("fallback", true);
            expect(res.body.errorCategory).toBe("PROJECT_RESTRICTION");
            expect(res.body.message).toMatch(/free tier is not available for this Google Cloud project/i);
        });

        it("should distinguish Quota / Rate-limit errors (429 / RESOURCE_EXHAUSTED)", async () => {
            mockGenerateContent.mockRejectedValue({
                status: 429,
                code: "RESOURCE_EXHAUSTED",
                message: "Resource has been exhausted (e.g. check quota).",
            });

            const res = await request(app)
                .post("/api/ai/generate-description")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ title: "Prepare DBMS practical file" });

            expect(res.statusCode).toBe(429);
            expect(res.body).toHaveProperty("fallback", true);
            expect(res.body.errorCategory).toBe("QUOTA_OR_RATE_LIMIT");
            expect(res.body.message).toMatch(/rate limit or free tier quota/i);
        });

        it("should distinguish Model Not Found or Retired errors (404)", async () => {
            mockGenerateContent.mockRejectedValue({
                status: 404,
                message: "models/gemini-old-model is not found.",
            });

            const res = await request(app)
                .post("/api/ai/generate-description")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ title: "Prepare DBMS practical file" });

            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty("fallback", true);
            expect(res.body.errorCategory).toBe("MODEL_NOT_FOUND");
            expect(res.body.message).toMatch(/model was not found/i);
        });
    });

    // -------------------------------------------------------------------------
    // TEST 6: Rate Limiting Lifecycle
    // -------------------------------------------------------------------------
    describe("AI Rate Limiting Lifecycle", () => {
        it("should accept first request, block repeat request with accurate remainingSeconds, and accept request after cooldown expires", async () => {
            mockGenerateContent.mockResolvedValue({
                text: "Sample Gemini task description.",
            });

            const testTitle = "Prepare DBMS practical file";

            // 1. FIRST ACCEPTED REQUEST
            const res1 = await request(app)
                .post("/api/ai/generate-description")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ title: testTitle });

            expect(res1.statusCode).toBe(200);
            expect(res1.body).toHaveProperty("success", true);
            expect(res1.body).toHaveProperty("description");

            // 2. BLOCKED REPEAT REQUEST (Same title with different casing/whitespace)
            const res2 = await request(app)
                .post("/api/ai/generate-description")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ title: "   PREPARE dbms practical file   " });

            expect(res2.statusCode).toBe(429);
            expect(res2.body).toHaveProperty("fallback", true);
            expect(res2.body).toHaveProperty("remainingSeconds");
            expect(typeof res2.body.remainingSeconds).toBe("number");
            expect(res2.body.remainingSeconds).toBeGreaterThanOrEqual(1);
            expect(res2.body.remainingSeconds).toBeLessThanOrEqual(60);
            expect(res2.body.message).toContain(`${res2.body.remainingSeconds}s`);

            // Verify stored timestamp was NOT reset by the blocked request
            const normalized = normalizeTitle(testTitle);
            const titleHash = crypto.createHash("sha256").update(`${mockUserId}:${normalized}`).digest("hex");
            const originalTimestamp = titleCooldownMap.get(titleHash);
            expect(originalTimestamp).toBeDefined();

            // 3. EXPIRE COOLDOWN (Simulate 61 seconds elapsed)
            titleCooldownMap.set(titleHash, Date.now() - 61000);

            // 4. REQUEST ACCEPTED AFTER COOLDOWN EXPIRES
            const res3 = await request(app)
                .post("/api/ai/generate-description")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ title: testTitle });

            expect(res3.statusCode).toBe(200);
            expect(res3.body).toHaveProperty("success", true);
            expect(res3.body.fallback).toBe(false);
        });

        it("should NOT start cooldown when a request is rejected with validation error", async () => {
            const res = await request(app)
                .post("/api/ai/generate-description")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ title: "ab" });

            expect(res.statusCode).toBe(400);

            const normalized = normalizeTitle("ab");
            const titleHash = crypto.createHash("sha256").update(`${mockUserId}:${normalized}`).digest("hex");
            expect(titleCooldownMap.has(titleHash)).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // TEST 7: Security - Error Sanitizer never leaks Google API Keys
    // -------------------------------------------------------------------------
    it("should sanitize Google API keys (AIza... and AQ...) from error messages", () => {
        const errorWithKey = {
            status: 400,
            message: "Authentication error with key AIzaSyD1234567890abcdef1234567890abcdef and AQ.Ab8RN6LE72rrVNc7bnTx0nBDkDihxOYPeTAmR0xg",
        };

        const parsed = parseGeminiError(errorWithKey);
        expect(parsed.sanitizedMessage).not.toContain("AIzaSyD1234567890abcdef1234567890abcdef");
        expect(parsed.sanitizedMessage).not.toContain("AQ.Ab8RN6LE72rrVNc7bnTx0nBDkDihxOYPeTAmR0xg");
        expect(parsed.sanitizedMessage).toContain("AIza***");
        expect(parsed.sanitizedMessage).toContain("AQ.***");
    });
});
