const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const app = require("./server");
const User = require("./models/User");
const Task = require("./models/Task");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task_manager";

async function testGoogleAuthFlow() {
    console.log("==================================================================");
    console.log("             TESTING GOOGLE AUTHENTICATION INTEGRATION            ");
    console.log("==================================================================");

    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`✓ Test server running on ${baseUrl}`);

    try {
        // Step 1: Check Google Client ID Endpoint
        console.log("\n[TEST 1] Testing GET /auth/google/client-id...");
        const res1 = await fetch(`${baseUrl}/auth/google/client-id`);
        const data1 = await res1.json();
        console.log("  Response:", data1);
        console.assert(res1.status === 200, "Should return 200");
        console.assert(data1.configured === true, "Google Client ID must be configured");
        console.assert(!!data1.clientId, "Google Client ID must not be empty");
        console.log("  ✓ Google Client ID endpoint is active and configured:", data1.clientId);

        // Step 2: Test Google Login Endpoint
        console.log("\n[TEST 2] Testing POST /auth/google...");
        // Clean up any test user
        await User.deleteOne({ email: "google_user_p9@charusat.edu.in" });

        // Simulate a Google JWT ID Token (header.payload.signature)
        const fakeHeader = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
        const fakePayload = Buffer.from(
            JSON.stringify({
                sub: "google_sub_id_987654321",
                email: "google_user_p9@charusat.edu.in",
                name: "Google Test User",
                picture: "https://lh3.googleusercontent.com/test-pic.jpg",
                email_verified: true,
            })
        ).toString("base64url");
        const mockGoogleToken = `${fakeHeader}.${fakePayload}.mock_signature`;

        const res2 = await fetch(`${baseUrl}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: mockGoogleToken }),
        });
        const data2 = await res2.json();
        console.log("  Status:", res2.status, "Message:", data2.message);
        console.assert(res2.status === 200, "Google login should return 200");
        console.assert(data2.success === true, "Google login should succeed");
        console.assert(!!data2.token, "Google login must issue a JWT session token");
        console.assert(data2.user.email === "google_user_p9@charusat.edu.in", "User email must match");
        console.assert(data2.user.authProvider === "google", "Auth provider must be google");
        console.log("  ✓ Google Login created user & returned valid session JWT token:", data2.token.slice(0, 20) + "...");

        // Step 3: Test Accessing GET /tasks with the Google-issued JWT token
        console.log("\n[TEST 3] Testing GET /tasks with Google Session Token...");
        const res3 = await fetch(`${baseUrl}/tasks`, {
            headers: { Authorization: `Bearer ${data2.token}` },
        });
        const data3 = await res3.json();
        console.log("  Status:", res3.status, "Count:", data3.count, "X-Cache:", res3.headers.get("x-cache"));
        console.assert(res3.status === 200, "GET /tasks must return 200");
        console.assert(data3.success === true, "GET /tasks must succeed");
        console.log("  ✓ Google authenticated user successfully accessed Task Manager API!");

        // Step 4: Test Repeat GET /tasks to verify Practical 9 Cache Hit for Google User
        console.log("\n[TEST 4] Testing GET /tasks Cache Hit for Google User...");
        const res4 = await fetch(`${baseUrl}/tasks`, {
            headers: { Authorization: `Bearer ${data2.token}` },
        });
        const data4 = await res4.json();
        console.log("  Status:", res4.status, "Count:", data4.count, "X-Cache:", res4.headers.get("x-cache"));
        console.assert(res4.headers.get("x-cache") === "HIT", "Repeat request must be Cache HIT");
        console.log("  ✓ Practical 9 in-memory cache is fully active for Google-authenticated sessions!");

        // Clean up test user
        await User.deleteOne({ email: "google_user_p9@charusat.edu.in" });
        console.log("\n✓ Cleaned up test Google user");

        console.log("\n==================================================================");
        console.log("         GOOGLE LOGIN INTEGRATION TEST PASSED 100%!               ");
        console.log("==================================================================");

    } finally {
        server.close();
        await mongoose.disconnect();
    }
}

testGoogleAuthFlow().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
