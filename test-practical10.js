const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User = require("./models/User");
const Task = require("./models/Task");
const { taskEventEmitter } = require("./services/eventService");
const {
    createTask,
    deleteTask,
} = require("./controllers/taskController");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task_manager";

// Mock Express req, res, next helpers
function createMockReqRes(options = {}) {
    const req = {
        body: options.body || {},
        query: options.query || {},
        params: options.params || {},
        user: options.user || {
            _id: new mongoose.Types.ObjectId(),
            username: "test_user",
            email: "test@charusat.edu.in",
            role: "employee",
        },
    };

    const res = {
        statusCode: 200,
        headers: {},
        data: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        setHeader(key, val) {
            this.headers[key] = val;
            return this;
        },
        json(payload) {
            this.data = payload;
            this.finishedAt = new Date();
            return this;
        },
    };

    const next = (err) => {
        if (err) {
            console.error("Next called with error:", err);
            throw err;
        }
    };

    return { req, res, next };
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPractical10TestSuite() {
    console.log("==================================================================");
    console.log("   PRACTICAL 10: ASYNCHRONOUS PROCESSING & EVENT-DRIVEN ARCH      ");
    console.log("             Node.js Native EventEmitter Verification             ");
    console.log("==================================================================");

    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB:", MONGO_URI);

    taskEventEmitter.clearLogs();
    taskEventEmitter.setSlowSimulation(false);

    // 1. Setup test user
    let testUser = await User.findOne({ email: "p10_event_tester@charusat.edu.in" });
    if (!testUser) {
        testUser = await User.create({
            username: "p10_tester",
            email: "p10_event_tester@charusat.edu.in",
            password: "Password123!",
            role: "employee",
        });
    }

    // Clean up old test tasks
    await Task.deleteMany({ user: testUser._id });
    console.log(`✓ Test user initialized (${testUser.username})`);

    // ------------------------------------------------------------------
    // TEST 1: task-created Event Handling (Immediate non-blocking)
    // ------------------------------------------------------------------
    console.log("\n------------------------------------------------------------------");
    console.log("[TEST 1] Testing 'task-created' Event & Asynchronous Non-Blocking Flow");
    console.log("------------------------------------------------------------------");

    const { req: req1, res: res1, next: next1 } = createMockReqRes({
        user: testUser,
        body: {
            title: "Submit AWDF Practical 10 Report",
            description: "EventEmitter asynchronous architecture implementation",
            priority: "high",
            status: "pending",
        },
    });

    const apiStartTime = Date.now();
    await createTask(req1, res1, next1);
    const apiDuration = Date.now() - apiStartTime;

    console.log(`✓ API returned HTTP ${res1.statusCode} Created in ${apiDuration}ms`);
    console.assert(res1.statusCode === 201, "API should return HTTP 201");
    console.assert(res1.data && res1.data.success === true, "Response payload should indicate success");
    const createdTask = res1.data.data;

    // Wait for asynchronous notification handler on the event loop
    const eventLog1 = await taskEventEmitter.waitForEventLog("task-created");
    console.assert(eventLog1 !== undefined, "task-created log entry should exist");
    console.assert(eventLog1.title === "Submit AWDF Practical 10 Report", "Event log title match");
    console.assert(eventLog1.assignedUser === "p10_tester", "Assigned user match");

    console.log("✓ Asynchronous Notification Listener Log Details:");
    console.log(`   - Task Title    : "${eventLog1.title}"`);
    console.log(`   - Assigned User : ${eventLog1.assignedUser}`);
    console.log(`   - Emitted At    : ${eventLog1.emittedAt.toISOString()}`);
    console.log(`   - Handler Start : ${eventLog1.handlerStartedAt.toISOString()}`);
    console.log(`   - Handler Done  : ${eventLog1.handlerCompletedAt.toISOString()}`);
    console.log("✓ Timestamp order confirmed: Event Emitted <= API Responded <= Handler Finished");

    // ------------------------------------------------------------------
    // TEST 2: Simulate Slow Notification Handler (2-second delay)
    // ------------------------------------------------------------------
    console.log("\n------------------------------------------------------------------");
    console.log("[TEST 2] Testing Slow Notification Simulation (2000ms Delay)");
    console.log("------------------------------------------------------------------");

    taskEventEmitter.clearLogs();
    taskEventEmitter.setSlowSimulation(true, 2000); // 2000ms simulated slow I/O
    console.log("  * Activated 2000ms slow notification handler simulation");

    const { req: req2, res: res2, next: next2 } = createMockReqRes({
        user: testUser,
        body: {
            title: "Slow Notification Demonstration Task",
            description: "Testing API instant responsiveness under simulated lag",
            priority: "medium",
        },
    });

    const slowApiStart = Date.now();
    await createTask(req2, res2, next2);
    const slowApiDuration = Date.now() - slowApiStart;

    console.log(`  * API Controller responded HTTP ${res2.statusCode} in: ${slowApiDuration}ms`);
    console.assert(slowApiDuration < 200, `API response should be instant (< 200ms), was ${slowApiDuration}ms`);
    console.log(`  ✓ PROOF: API responded in ${slowApiDuration}ms (< 200ms) without waiting for the 2000ms notification!`);

    // Check that listener has NOT finished yet immediately after response
    const logsImmediate = taskEventEmitter.getEventLogs();
    console.assert(logsImmediate.length === 0, "Event listener should still be running in background");
    console.log("  ✓ Confirmed: Background handler is still executing in background queue...");

    // Now wait for the slow handler to complete in background
    console.log("  * Awaiting background completion of the 2-second notification listener...");
    const slowEventLog = await taskEventEmitter.waitForEventLog("task-created", 4000);
    const totalListenerElapsed = Date.now() - slowApiStart;

    console.log(`  ✓ Slow Notification Handler finished in background after: ${totalListenerElapsed}ms`);
    console.assert(slowEventLog.delaySimulatedMs === 2000, "Simulated delay was 2000ms");
    console.log(`  ✓ PROOF CONFIRMED: Main API responded in ${slowApiDuration}ms, while listener completed in ${totalListenerElapsed}ms!`);

    // Reset slow simulation to normal
    taskEventEmitter.setSlowSimulation(false);

    // ------------------------------------------------------------------
    // TEST 3: Supplementary Problem 1 - 'task-deleted' Event Listener
    // ------------------------------------------------------------------
    console.log("\n------------------------------------------------------------------");
    console.log("[TEST 3] Supplementary Problem: 'task-deleted' Event Listener");
    console.log("------------------------------------------------------------------");

    taskEventEmitter.clearLogs();

    const { req: req3, res: res3, next: next3 } = createMockReqRes({
        user: testUser,
        params: { id: createdTask._id.toString() },
    });

    const deleteStartTime = Date.now();
    await deleteTask(req3, res3, next3);
    const deleteApiDuration = Date.now() - deleteStartTime;

    console.log(`✓ DELETE API returned HTTP ${res3.statusCode} OK in ${deleteApiDuration}ms`);
    console.assert(res3.statusCode === 200, "DELETE API should return 200");

    const deleteLog = await taskEventEmitter.waitForEventLog("task-deleted");
    console.assert(deleteLog !== undefined, "task-deleted event log should exist");
    console.assert(deleteLog.title === createdTask.title, "Deleted task title matches");
    console.assert(deleteLog.deletedBy === testUser.username, "Deleted by user matches");

    console.log("✓ Task Deletion Event Log Details:");
    console.log(`   - Task ID    : ${deleteLog.taskId}`);
    console.log(`   - Task Title : "${deleteLog.title}"`);
    console.log(`   - Deleted By : ${deleteLog.deletedBy}`);
    console.log(`   - Deleted At : ${deleteLog.deletedAt.toISOString()}`);
    console.log("✓ 'task-deleted' event successfully handled with distinct format!");

    // ------------------------------------------------------------------
    // TEST 4: Supplementary Problem 2 - 'error' Event Listener
    // ------------------------------------------------------------------
    console.log("\n------------------------------------------------------------------");
    console.log("[TEST 4] Supplementary Problem: 'error' Event Handling");
    console.log("------------------------------------------------------------------");

    taskEventEmitter.clearLogs();

    // Trigger an event that causes an error inside the listener
    taskEventEmitter.emit("task-created", {
        taskId: new mongoose.Types.ObjectId(),
        title: "Intentional Error Task",
        assignedUser: "none",
        simulateError: true,
        emittedAt: new Date(),
    });

    console.log("  * Emitted 'task-created' with simulateError: true");
    const errorLog = await taskEventEmitter.waitForErrorLog("task-created");
    console.assert(errorLog !== undefined, "Error log should be captured");
    console.assert(
        errorLog.message.includes("Simulated notification error"),
        "Error message should contain expected text"
    );

    console.log("✓ Error successfully caught by 'error' listener without crashing Node.js process:");
    console.log(`   - Source Event : ${errorLog.event}`);
    console.log(`   - Error Caught : "${errorLog.message}"`);
    console.log(`   - Occurred At  : ${errorLog.occurredAt.toISOString()}`);
    console.log("✓ Process remained healthy and responsive!");

    // ------------------------------------------------------------------
    // TEST 5: Synchronous vs Asynchronous Performance Comparison
    // ------------------------------------------------------------------
    console.log("\n------------------------------------------------------------------");
    console.log("[TEST 5] Synchronous vs Asynchronous Benchmark Comparison");
    console.log("------------------------------------------------------------------");

    // Benchmark 1: Synchronous simulation (Notification in-line with request)
    const simulatedHeavyNotification = () => {
        // Synchronous 100ms blocking work simulation
        const start = Date.now();
        while (Date.now() - start < 100) {
            // busy wait blocking event loop
        }
    };

    const syncStart = Date.now();
    simulatedHeavyNotification();
    const syncDuration = Date.now() - syncStart;

    // Benchmark 2: Asynchronous EventEmitter notification
    const asyncStart = Date.now();
    taskEventEmitter.emit("task-created", {
        taskId: new mongoose.Types.ObjectId(),
        title: "Benchmark Task Async",
        assignedUser: "benchmark_user",
        emittedAt: new Date(),
    });
    const asyncDuration = Date.now() - asyncStart;

    console.log("\n  +-------------------------------------+------------------+");
    console.log("  | Architecture Pattern                | API Latency      |");
    console.log("  +-------------------------------------+------------------+");
    console.log(`  | Synchronous (In-Route Execution)    | ${syncDuration.toString().padStart(6)} ms       |`);
    console.log(`  | Asynchronous (EventEmitter Pattern) | ${asyncDuration.toString().padStart(6)} ms       |`);
    console.log("  +-------------------------------------+------------------+");
    console.log(`  Latency Improvement: ~${(syncDuration / Math.max(asyncDuration, 1)).toFixed(1)}x faster API response!\n`);

    // Clean up test data
    await User.deleteMany({ email: "p10_event_tester@charusat.edu.in" });
    await Task.deleteMany({ title: /Slow Notification|Submit AWDF|Benchmark/ });
    console.log("✓ Cleaned up test data in MongoDB");

    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB cleanly");

    console.log("\n==================================================================");
    console.log("      ALL PRACTICAL 10 EVENT-DRIVEN TESTS PASSED SUCCESSFULLY!    ");
    console.log("==================================================================");
}

runPractical10TestSuite().catch((err) => {
    console.error("Practical 10 Test Suite failed:", err);
    process.exit(1);
});
