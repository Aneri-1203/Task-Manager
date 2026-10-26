const NodeCache = require("node-cache");

// ============================================================================
// TASK LIST IN-MEMORY CACHE (node-cache)
// Practical 9: In-Memory Caching with 60-second TTL & Immediate Invalidation
// ============================================================================

// Initialize node-cache with a 60-second default TTL and 120-second cleanup cycle
const taskCache = new NodeCache({
    stdTTL: 60,       // 60-second TTL
    checkperiod: 120, // Automatic deletion check every 120 seconds
    useClones: true,  // Prevent accidental in-memory mutations
});

/**
 * Generate a deterministic, normalized cache key for task list queries.
 * Format: task_list:u_<userId>:r_<role>:<sorted_json_query>
 *
 * @param {string} userId - Authenticated user's ID
 * @param {string} role - Authenticated user's role (admin | manager | employee)
 * @param {object} query - Query parameters (status, priority, page, sort, etc.)
 * @returns {string} Deterministic cache key
 */
const generateTaskListKey = (userId, role, query = {}) => {
    // Sort query keys so parameter ordering differences don't cause duplicate keys
    const sortedKeys = Object.keys(query).sort();
    const normalizedQuery = {};

    for (const key of sortedKeys) {
        const val = query[key];
        if (val !== undefined && val !== null && val !== "") {
            normalizedQuery[key] = String(val).trim();
        }
    }

    const querySegment = JSON.stringify(normalizedQuery);
    return `task_list:u_${userId}:r_${role}:${querySegment}`;
};

/**
 * Retrieve cached task list by key.
 *
 * @param {string} key - Cache key
 * @returns {object|undefined} Cached data or undefined if cache miss
 */
const getCachedTaskList = (key) => {
    return taskCache.get(key);
};

/**
 * Store task list in cache with standard 60-second TTL.
 * Correctly caches empty task lists ({ success: true, count: 0, data: [] }).
 *
 * @param {string} key - Cache key
 * @param {object} data - Response payload to cache
 * @param {number} [ttl=60] - Optional TTL override in seconds
 * @returns {boolean} True if successfully cached
 */
const setCachedTaskList = (key, data, ttl = 60) => {
    return taskCache.set(key, data, ttl);
};

/**
 * Invalidate affected task-list cache entries after POST, PUT/PATCH, and DELETE.
 *
 * In a role-based task manager:
 * - If affectedUserIds are provided (e.g. creator, assignee, assigner),
 *   we invalidate cache entries for those specific users.
 * - Additionally, because Admins and Managers have organizational oversight of
 *   subordinate and team tasks, their task list caches are invalidated so they
 *   immediately see created, updated, or deleted tasks.
 * - If no user IDs are passed (or clearAll is needed), all task list entries are flushed.
 *
 * @param {Array<string|object>} [affectedUserIds=[]] - Array of user IDs affected
 * @returns {number} Count of invalidated cache entries
 */
const invalidateTaskListCache = (affectedUserIds = []) => {
    const allKeys = taskCache.keys();
    const taskListKeys = allKeys.filter((k) => k.startsWith("task_list:"));

    if (taskListKeys.length === 0) {
        return 0;
    }

    // If no specific users are provided, flush all task-list caches
    if (!affectedUserIds || affectedUserIds.length === 0) {
        const count = taskCache.del(taskListKeys);
        console.log(`[Cache Invalidation] Flushed all ${count} task-list entries.`);
        return count;
    }

    // Normalize IDs to strings
    const targetIds = affectedUserIds
        .filter(Boolean)
        .map((id) => (typeof id === "object" && id._id ? id._id.toString() : id.toString()));

    // Delete keys belonging to affected users OR admins/managers who oversee them
    const keysToDelete = taskListKeys.filter((key) => {
        const isAffectedUser = targetIds.some((uid) => key.includes(`:u_${uid}:`));
        const isAdminOrManager = key.includes(":r_admin:") || key.includes(":r_manager:");
        return isAffectedUser || isAdminOrManager;
    });

    if (keysToDelete.length > 0) {
        const count = taskCache.del(keysToDelete);
        console.log(`[Cache Invalidation] Removed ${count} affected cache entries:`, keysToDelete);
        return count;
    }

    return 0;
};

/**
 * Flush the entire cache (useful for testing or full resets)
 */
const flushAllCache = () => {
    taskCache.flushAll();
    console.log("[Cache] All cache entries flushed.");
};

module.exports = {
    taskCache,
    generateTaskListKey,
    getCachedTaskList,
    setCachedTaskList,
    invalidateTaskListCache,
    flushAllCache,
};
