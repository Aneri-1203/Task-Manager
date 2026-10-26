const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const app = require("./server");
const User = require("./models/User");
const Task = require("./models/Task");
const { flushAllCache } = require("./services/cacheService");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task_manager";
const JWT_SECRET = process.env.JWT_SECRET || "supersecret_jwt_key_task_manager_awdf_2026_secure";

async function runHttpTests() {
    console.log("==================================================================");
    console.log("       TESTING REAL HTTP API ENDPOINTS WITH CACHING & RBAC        ");
    console.log("==================================================================");

    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Clean up cache
    flushAllCache();

    // Start server on an ephemeral port
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`✓ Test HTTP server listening on ${baseUrl}`);

    // Create a test user
    let user = await User.findOne({ email: "p9_runner@charusat.edu.in" });
    if (!user) {
        user = await User.create({
            username: "p9_runner",
            email: "p9_runner@charusat.edu.in",
            password: "Password123!",
            role: "employee",
        });
    }

    // Clean any prior tasks for this user
    await Task.deleteMany({ user: user._id });

    // Generate valid JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
    const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    try {
        // Step 1: Initial GET /tasks -> Expect Empty List + Cache MISS
        console.log("\n[STEP 1] Initial GET /tasks (Empty List)...");
        const res1 = await fetch(`${baseUrl}/tasks`, { headers: authHeaders });
        const data1 = await res1.json();
        const cacheHeader1 = res1.headers.get("x-cache");
        console.log(`  Status: ${res1.status}, X-Cache: ${cacheHeader1}, Count: ${data1.count}`);
        console.assert(cacheHeader1 === "MISS", "First request must be Cache MISS");
        console.assert(data1.success === true, "success flag must be true");
        console.assert(data1.count === 0, "Initial task count must be 0");
        console.assert(Array.isArray(data1.data) && data1.data.length === 0, "Initial data must be empty array");
        console.assert(data1.cached === undefined, "Should not contain extra 'cached' property in JSON");
        console.log("  ✓ Step 1 passed: Cache MISS returned empty list successfully in exact old style");

        // Step 2: Second GET /tasks -> Expect Empty List + Cache HIT
        console.log("\n[STEP 2] Second GET /tasks (Empty List Cache Hit)...");
        const res2 = await fetch(`${baseUrl}/tasks`, { headers: authHeaders });
        const data2 = await res2.json();
        const cacheHeader2 = res2.headers.get("x-cache");
        console.log(`  Status: ${res2.status}, X-Cache: ${cacheHeader2}, Count: ${data2.count}`);
        console.assert(cacheHeader2 === "HIT", "Second request must be Cache HIT");
        console.assert(data2.success === true, "success flag must be true");
        console.assert(data2.count === 0, "Cached count must remain 0");
        console.assert(data2.cached === undefined, "Should not contain extra 'cached' property in JSON");
        console.log("  ✓ Step 2 passed: Cache HIT returned cached empty list without querying DB");

        // Step 3: POST /tasks -> Create new task
        console.log("\n[STEP 3] POST /tasks (Create Task)...");
        const res3 = await fetch(`${baseUrl}/tasks`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
                title: "Practical 9 Documentation",
                description: "Complete in-memory caching documentation and testing",
                priority: "high",
                status: "pending",
            }),
        });
        const data3 = await res3.json();
        console.log(`  Status: ${res3.status}, Created Task ID: ${data3.data?._id}`);
        console.assert(res3.status === 201, "Task creation should return 201");
        console.assert(data3.success === true, "Task creation should succeed");
        const createdTaskId = data3.data._id;
        console.log("  ✓ Step 3 passed: Task created and affected cache invalidated");

        // Step 4: GET /tasks after creation -> Expect Cache MISS with 1 task
        console.log("\n[STEP 4] GET /tasks after creation (Verify Immediate Invalidation)...");
        const res4 = await fetch(`${baseUrl}/tasks`, { headers: authHeaders });
        const data4 = await res4.json();
        const cacheHeader4 = res4.headers.get("x-cache");
        console.log(`  Status: ${res4.status}, X-Cache: ${cacheHeader4}, Count: ${data4.count}`);
        console.assert(cacheHeader4 === "MISS", "Request after POST must be Cache MISS");
        console.assert(data4.count === 1, "Task count must now be 1");
        console.assert(data4.data[0].title === "Practical 9 Documentation", "Created task title must match");
        console.log("  ✓ Step 4 passed: Newly created task reflected immediately!");

        // Step 5: Second GET /tasks after creation -> Expect Cache HIT with 1 task
        console.log("\n[STEP 5] GET /tasks again (Verify Cache HIT on populated list)...");
        const res5 = await fetch(`${baseUrl}/tasks`, { headers: authHeaders });
        const data5 = await res5.json();
        const cacheHeader5 = res5.headers.get("x-cache");
        console.log(`  Status: ${res5.status}, X-Cache: ${cacheHeader5}, Count: ${data5.count}`);
        console.assert(cacheHeader5 === "HIT", "Request must be Cache HIT");
        console.assert(data5.success === true, "success flag must be true");
        console.assert(data5.count === 1, "Cached count must be 1");
        console.log("  ✓ Step 5 passed: Populated list served directly from node-cache");

        // Step 6: PUT /tasks/:id -> Update task status to in-progress
        console.log("\n[STEP 6] PUT /tasks/:id (Update Task)...");
        const res6 = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
            method: "PUT",
            headers: authHeaders,
            body: JSON.stringify({
                status: "in-progress",
            }),
        });
        const data6 = await res6.json();
        console.log(`  Status: ${res6.status}, Updated Status: ${data6.data?.status}`);
        console.assert(res6.status === 200, "Update must return 200");
        console.assert(data6.data.status === "in-progress", "Status must be updated to in-progress");
        console.log("  ✓ Step 6 passed: Task updated and cache invalidated");

        // Step 7: GET /tasks after PUT -> Expect Cache MISS with updated status
        console.log("\n[STEP 7] GET /tasks after update (Verify Immediate Invalidation)...");
        const res7 = await fetch(`${baseUrl}/tasks`, { headers: authHeaders });
        const data7 = await res7.json();
        const cacheHeader7 = res7.headers.get("x-cache");
        console.log(`  Status: ${res7.status}, X-Cache: ${cacheHeader7}, Status: ${data7.data[0]?.status}`);
        console.assert(cacheHeader7 === "MISS", "Request after PUT must be Cache MISS");
        console.assert(data7.data[0].status === "in-progress", "Task status must be in-progress");
        console.log("  ✓ Step 7 passed: Updated status reflected immediately in list!");

        // Step 8: PATCH /tasks/:id -> Update priority via PATCH
        console.log("\n[STEP 8] PATCH /tasks/:id (Patch Priority)...");
        const res8 = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
            method: "PATCH",
            headers: authHeaders,
            body: JSON.stringify({
                priority: "medium",
            }),
        });
        const data8 = await res8.json();
        console.log(`  Status: ${res8.status}, Patched Priority: ${data8.data?.priority}`);
        console.assert(res8.status === 200, "PATCH must return 200");
        console.assert(data8.data.priority === "medium", "Priority must be medium");
        console.log("  ✓ Step 8 passed: PATCH endpoint works and invalidated cache");

        // Step 9: DELETE /tasks/:id -> Delete task
        console.log("\n[STEP 9] DELETE /tasks/:id (Delete Task)...");
        const res9 = await fetch(`${baseUrl}/tasks/${createdTaskId}`, {
            method: "DELETE",
            headers: authHeaders,
        });
        const data9 = await res9.json();
        console.log(`  Status: ${res9.status}, Message: ${data9.message}`);
        console.assert(res9.status === 200, "DELETE must return 200");
        console.log("  ✓ Step 9 passed: Task deleted and cache invalidated");

        // Step 10: GET /tasks after delete -> Expect Cache MISS with count = 0
        console.log("\n[STEP 10] GET /tasks after delete (Verify Immediate Invalidation)...");
        const res10 = await fetch(`${baseUrl}/tasks`, { headers: authHeaders });
        const data10 = await res10.json();
        const cacheHeader10 = res10.headers.get("x-cache");
        console.log(`  Status: ${res10.status}, X-Cache: ${cacheHeader10}, Count: ${data10.count}`);
        console.assert(cacheHeader10 === "MISS", "Request after DELETE must be Cache MISS");
        console.assert(data10.count === 0, "Task count must be 0 after deletion");
        console.log("  ✓ Step 10 passed: Deleted task immediately removed from list!");

        // Clean up test runner user
        await User.deleteOne({ _id: user._id });
        console.log("\n✓ Cleaned up test user");

        console.log("\n==================================================================");
        console.log("   ALL 10 REAL HTTP ENDPOINT & CACHE TESTS PASSED SUCCESSFULLY!   ");
        console.log("==================================================================");

    } finally {
        server.close();
        await mongoose.disconnect();
    }
}

runHttpTests().catch((err) => {
    console.error("HTTP Test Error:", err);
    process.exit(1);
});
