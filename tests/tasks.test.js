const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Set environment configuration for automated CI testing
process.env.JWT_SECRET = process.env.JWT_SECRET || "ci_test_jwt_secret_key_98765";
process.env.NODE_ENV = "test";
process.env.PORT = "5099";

// Mock Mongoose models to allow isolated API testing without a live MongoDB connection
const Task = require("../models/Task");
const User = require("../models/User");
const { flushAllCache } = require("../services/cacheService");

jest.mock("../models/Task");
jest.mock("../models/User");

// Import the existing Express app configuration
const app = require("../server");

describe("Task Management API - CI/CD Automated Test Suite", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockTaskId = new mongoose.Types.ObjectId().toString();

    const mockUser = {
        _id: mockUserId,
        username: "ci_tester",
        email: "tester@charusat.edu.in",
        role: "employee",
    };

    const mockTask = {
        _id: mockTaskId,
        title: "Practical 12 CI Pipeline Verification",
        description: "Automated API integration test under GitHub Actions",
        status: "pending",
        priority: "high",
        completed: false,
        user: mockUser,
        assignedTo: mockUser,
        assignedBy: mockUser,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    let validAuthToken;

    // Helper to create chainable query mocks (.populate().sort() etc.)
    const createChainableQuery = (resolvedValue) => {
        const chain = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            then: (resolve, reject) => Promise.resolve(resolvedValue).then(resolve, reject),
            catch: (reject) => Promise.resolve(resolvedValue).catch(reject),
        };
        return chain;
    };

    beforeAll(() => {
        // Generate a valid JWT token signed with test secret
        validAuthToken = jwt.sign(
            {
                id: mockUserId,
                username: mockUser.username,
                email: mockUser.email,
                role: mockUser.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
    });

    beforeEach(() => {
        jest.clearAllMocks();
        flushAllCache();

        // Default mock behaviors
        User.findById.mockResolvedValue(mockUser);
        Task.find.mockReturnValue(createChainableQuery([mockTask]));
        Task.findById.mockReturnValue(createChainableQuery(mockTask));
        Task.create.mockResolvedValue(mockTask);
    });

    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated request should be rejected by authMiddleware
    // -------------------------------------------------------------------------
    describe("GET /tasks (Authentication Guard)", () => {
        it("should return HTTP 401 Unauthorized when no JWT token is provided", async () => {
            const res = await request(app).get("/tasks");

            expect(res.statusCode).toBe(401);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body.message).toMatch(/Authentication required/i);
        });
    });

    // -------------------------------------------------------------------------
    // TEST 2: GET /tasks returns HTTP 200 and task list (Primary Practical 12 requirement)
    // -------------------------------------------------------------------------
    describe("GET /tasks (Retrieve All Tasks)", () => {
        it("should return HTTP 200 and a list of tasks for authenticated user", async () => {
            const res = await request(app)
                .get("/tasks")
                .set("Authorization", `Bearer ${validAuthToken}`);

            // To deliberately fail this test for demonstration:
            // Change 200 below to 201 or 500 (e.g., expect(res.statusCode).toBe(201))
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.count).toBe(1);
            expect(res.body.data[0].title).toBe("Practical 12 CI Pipeline Verification");
        });

        it("should return HTTP 200 when filtering by individual user (userId)", async () => {
            const res = await request(app)
                .get(`/tasks?userId=${mockUserId}`)
                .set("Authorization", `Bearer ${validAuthToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it("should return HTTP 200 when filtering for that individual's own tasks (self=true)", async () => {
            const res = await request(app)
                .get("/tasks?self=true")
                .set("Authorization", `Bearer ${validAuthToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // TEST 3: POST /tasks creates a new task and returns HTTP 201
    // -------------------------------------------------------------------------
    describe("POST /tasks (Create Task)", () => {
        it("should return HTTP 201 Created when a valid task payload is submitted", async () => {
            const newTaskPayload = {
                title: "Practical 12 CI Pipeline Verification",
                description: "Automated API integration test under GitHub Actions",
                priority: "high",
                status: "pending",
            };

            const res = await request(app)
                .post("/tasks")
                .set("Authorization", `Bearer ${validAuthToken}`)
                .send(newTaskPayload);

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("data");
            expect(res.body.data.title).toBe(newTaskPayload.title);
        });

        it("should return HTTP 400 Bad Request when title is missing", async () => {
            const res = await request(app)
                .post("/tasks")
                .set("Authorization", `Bearer ${validAuthToken}`)
                .send({ description: "Missing title payload" });

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body.message).toMatch(/Task title is required/i);
        });
    });

    // -------------------------------------------------------------------------
    // TEST 4: GET /tasks/:id returns single task details
    // -------------------------------------------------------------------------
    describe("GET /tasks/:id (Retrieve Task By ID)", () => {
        it("should return HTTP 200 and the requested task", async () => {
            const res = await request(app)
                .get(`/tasks/${mockTaskId}`)
                .set("Authorization", `Bearer ${validAuthToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body.data).toHaveProperty("_id", mockTaskId);
            expect(res.body.data.title).toBe("Practical 12 CI Pipeline Verification");
        });
    });

    // -------------------------------------------------------------------------
    // TEST 5: Public Route Verification (GET /auth/google/client-id)
    // -------------------------------------------------------------------------
    describe("GET /auth/google/client-id (Public Configuration Endpoint)", () => {
        it("should return HTTP 200 with google client configuration status", async () => {
            const res = await request(app).get("/auth/google/client-id");

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("configured");
        });
    });
});
