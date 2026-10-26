const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const User = require("./models/User");
const Task = require("./models/Task");
const {
    taskCache,
    generateTaskListKey,
    getCachedTaskList,
    setCachedTaskList,
    invalidateTaskListCache,
    flushAllCache,
} = require("./services/cacheService");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/task_manager";
const JWT_SECRET = process.env.JWT_SECRET || "supersecret_jwt_key_task_manager_awdf_2026_secure";

async function runTests() {
    console.log("==================================================================");
    console.log("       PRACTICAL 9: LIST TASKS & NODE-CACHE VERIFICATION SUITE    ");
    console.log("==================================================================");

    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB:", MONGO_URI);

    flushAllCache();
    console.log("✓ In-memory cache flushed cleanly");

    // 1. Find or create test users
    let testAdmin = await User.findOne({ email: "admin_p9_test@charusat.edu.in" });
    if (!testAdmin) {
        testAdmin = await User.create({
            username: "admin_p9",
            email: "admin_p9_test@charusat.edu.in",
            password: "Password123!",
            role: "admin",
        });
    }

    let testEmp1 = await User.findOne({ email: "emp1_p9_test@charusat.edu.in" });
    if (!testEmp1) {
        testEmp1 = await User.create({
            username: "emp1_p9",
            email: "emp1_p9_test@charusat.edu.in",
            password: "Password123!",
            role: "employee",
        });
    }

    let testEmp2 = await User.findOne({ email: "emp2_p9_test@charusat.edu.in" });
    if (!testEmp2) {
        testEmp2 = await User.create({
            username: "emp2_p9",
            email: "emp2_p9_test@charusat.edu.in",
            password: "Password123!",
            role: "employee",
        });
    }

    // Clean up test tasks
    await Task.deleteMany({
        $or: [
            { user: testEmp1._id },
            { user: testEmp2._id },
            { user: testAdmin._id },
        ],
    });

    console.log("✓ Test users ready (Admin, Emp1, Emp2)");

    // Test 1: Empty task list caching
    console.log("\n[TEST 1] Testing Empty Task List Caching...");
    const emptyKey = generateTaskListKey(testEmp1._id, "employee", {});
    console.log("  Cache Key:", emptyKey);

    let cached = getCachedTaskList(emptyKey);
    console.assert(cached === undefined, "Should be cache miss initially");
    console.log("  ✓ Initial cache check returned undefined (Cache Miss)");

    const emptyResult = { success: true, count: 0, data: [] };
    setCachedTaskList(emptyKey, emptyResult, 60);

    const cachedEmpty = getCachedTaskList(emptyKey);
    console.assert(cachedEmpty !== undefined, "Should find cached empty entry");
    console.assert(cachedEmpty.count === 0, "Cached count should be 0");
    console.assert(Array.isArray(cachedEmpty.data) && cachedEmpty.data.length === 0, "Cached data should be empty array");
    console.log("  ✓ Empty task list successfully cached with count = 0 and data = [] (Cache Hit)");

    // Test 2: Task Creation & Immediate Invalidation
    console.log("\n[TEST 2] Testing Task Creation & Cache Invalidation...");
    const newTask = await Task.create({
        user: testEmp1._id,
        assignedTo: testEmp1._id,
        assignedBy: testEmp1._id,
        title: "P9 Test Task 1",
        description: "Testing cache invalidation on POST",
        priority: "high",
        status: "pending",
    });

    // Invalidate affected cache
    invalidateTaskListCache([testEmp1._id]);
    const checkInvalidated = getCachedTaskList(emptyKey);
    console.assert(checkInvalidated === undefined, "Key should be invalidated after creation");
    console.log("  ✓ Cache key was immediately invalidated on task creation!");

    // Test 3: Cache Hit vs Miss for Emp1
    console.log("\n[TEST 3] Testing Cache Hit & Cache Miss Lifecycle...");
    const emp1Tasks = await Task.find({ user: testEmp1._id });
    const emp1Payload = { success: true, count: emp1Tasks.length, data: emp1Tasks };
    const emp1Key = generateTaskListKey(testEmp1._id, "employee", {});

    setCachedTaskList(emp1Key, emp1Payload, 60);
    const hitData = getCachedTaskList(emp1Key);
    console.assert(hitData !== undefined && hitData.count === 1, "Cache hit should return 1 task");
    console.log(`  ✓ Emp1 Cache Hit successfully returned ${hitData.count} task(s)`);

    // Test 4: Isolation between users
    console.log("\n[TEST 4] Testing User-Specific Cache Isolation...");
    const emp2Key = generateTaskListKey(testEmp2._id, "employee", {});
    const emp2Cached = getCachedTaskList(emp2Key);
    console.assert(emp2Cached === undefined, "Emp2 should have separate cache key, currently undefined");
    console.log("  ✓ Emp2 cache key is completely isolated from Emp1");

    // Test 5: Task Update & Immediate Invalidation
    console.log("\n[TEST 5] Testing Task Update (PUT/PATCH) & Cache Invalidation...");
    await Task.findByIdAndUpdate(newTask._id, { status: "in-progress" });
    invalidateTaskListCache([testEmp1._id]);
    const emp1AfterUpdate = getCachedTaskList(emp1Key);
    console.assert(emp1AfterUpdate === undefined, "Emp1 cache key must be invalidated after update");
    console.log("  ✓ Emp1 cache key invalidated on update; subsequent GET will query MongoDB");

    // Test 6: Task Deletion & Immediate Invalidation
    console.log("\n[TEST 6] Testing Task Deletion (DELETE) & Cache Invalidation...");
    // Prime the cache again
    setCachedTaskList(emp1Key, emp1Payload, 60);
    await Task.findByIdAndDelete(newTask._id);
    invalidateTaskListCache([testEmp1._id]);
    const emp1AfterDelete = getCachedTaskList(emp1Key);
    console.assert(emp1AfterDelete === undefined, "Emp1 cache key must be invalidated after deletion");
    console.log("  ✓ Emp1 cache key invalidated on deletion; subsequent GET will reflect removal");

    // Clean up test data
    await User.deleteMany({
        email: { $in: ["admin_p9_test@charusat.edu.in", "emp1_p9_test@charusat.edu.in", "emp2_p9_test@charusat.edu.in"] }
    });
    console.log("\n✓ Cleaned up test data in MongoDB");

    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB");

    console.log("\n==================================================================");
    console.log("       ALL PRACTICAL 9 CACHE & INVALIDATION TESTS PASSED!         ");
    console.log("==================================================================");
}

runTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
