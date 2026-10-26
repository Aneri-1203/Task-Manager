const EventEmitter = require("events");

// ============================================================================
// TASK EVENT EMITTER SERVICE (Node.js Native EventEmitter)
// Practical 10: Asynchronous Processing with Event-Driven Architecture
// ============================================================================

class TaskEventEmitter extends EventEmitter {
    constructor() {
        super();
        // Set maximum listeners to avoid default limit warnings
        this.setMaxListeners(20);

        // Slow notification simulation toggle and delay (in ms)
        this.slowSimulationDelay = 0;

        // In-memory audit logs for event verification and testing
        this.eventLogs = [];
        this.errorLogs = [];

        // Register default background listeners
        this.registerDefaultListeners();
    }

    /**
     * Configure simulated slow notification processing (e.g. 2000ms delay).
     * @param {boolean} enabled - Whether slow simulation is active
     * @param {number} [delayMs=2000] - Duration of simulated delay in milliseconds
     */
    setSlowSimulation(enabled, delayMs = 2000) {
        this.slowSimulationDelay = enabled ? delayMs : 0;
    }

    /**
     * Record an executed event into the in-memory audit log.
     * @param {object} logEntry - Event metadata
     */
    recordEventLog(logEntry) {
        this.eventLogs.push(logEntry);
        // Retain last 100 entries to prevent memory growth
        if (this.eventLogs.length > 100) {
            this.eventLogs.shift();
        }
    }

    /**
     * Record an error into the in-memory error audit log.
     * @param {object} errorEntry - Error details
     */
    recordErrorLog(errorEntry) {
        this.errorLogs.push(errorEntry);
        if (this.errorLogs.length > 100) {
            this.errorLogs.shift();
        }
    }

    /**
     * Get recorded event logs.
     * @returns {Array<object>}
     */
    getEventLogs() {
        return [...this.eventLogs];
    }

    /**
     * Get recorded error logs.
     * @returns {Array<object>}
     */
    getErrorLogs() {
        return [...this.errorLogs];
    }

    /**
     * Clear all recorded logs.
     */
    clearLogs() {
        this.eventLogs = [];
        this.errorLogs = [];
    }

    /**
     * Helper to wait for a specific event log entry to appear (useful for tests).
     * @param {string} eventName - Name of the event
     * @param {number} [timeoutMs=5000] - Maximum wait time
     * @returns {Promise<object>}
     */
    waitForEventLog(eventName, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const interval = setInterval(() => {
                const found = this.eventLogs.find((l) => l.event === eventName);
                if (found) {
                    clearInterval(interval);
                    return resolve(found);
                }
                if (Date.now() - startTime > timeoutMs) {
                    clearInterval(interval);
                    return reject(new Error(`Timeout waiting for event '${eventName}' after ${timeoutMs}ms`));
                }
            }, 50);
        });
    }

    /**
     * Helper to wait for an error log entry to appear.
     * @param {string} eventName - Name of the source event
     * @param {number} [timeoutMs=5000] - Maximum wait time
     * @returns {Promise<object>}
     */
    waitForErrorLog(eventName, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const interval = setInterval(() => {
                const found = this.errorLogs.find((l) => l.event === eventName);
                if (found) {
                    clearInterval(interval);
                    return resolve(found);
                }
                if (Date.now() - startTime > timeoutMs) {
                    clearInterval(interval);
                    return reject(new Error(`Timeout waiting for error in '${eventName}' after ${timeoutMs}ms`));
                }
            }, 50);
        });
    }

    /**
     * Register core event listeners for task-created, task-deleted, and error.
     */
    registerDefaultListeners() {
        // --------------------------------------------------------------------
        // 1. EVENT: task-created
        // Asynchronously handles notifications when a new task is created.
        // --------------------------------------------------------------------
        this.on("task-created", (taskData) => {
            const delay = this.slowSimulationDelay || 0;
            const scheduler = delay > 0 ? (fn) => setTimeout(fn, delay) : setImmediate;

            // Non-blocking asynchronous execution scheduled on the event loop
            scheduler(async () => {
                const handlerStartedAt = new Date();
                try {
                    // Check if simulated error was requested
                    if (taskData.simulateError) {
                        throw new Error(`Simulated notification error for task "${taskData.title}"`);
                    }

                    const assignedUser =
                        taskData.assignedTo?.username ||
                        taskData.assignedTo?.email ||
                        taskData.assignedUser ||
                        "Unassigned";

                    const taskTitle = taskData.title || "Untitled Task";
                    const emittedAt = taskData.emittedAt || handlerStartedAt;

                    const logEntry = {
                        event: "task-created",
                        taskId: taskData.taskId,
                        title: taskTitle,
                        assignedUser,
                        emittedAt: new Date(emittedAt),
                        handlerStartedAt,
                        handlerCompletedAt: new Date(),
                        durationMs: Date.now() - handlerStartedAt.getTime(),
                        delaySimulatedMs: delay,
                    };

                    console.log("--------------------------------------------------");
                    console.log(`[EVENT: task-created] Asynchronous Notification Triggered`);
                    console.log(`  Task Title    : "${taskTitle}"`);
                    console.log(`  Assigned User : ${assignedUser}`);
                    console.log(`  Event Emitted : ${new Date(emittedAt).toISOString()}`);
                    console.log(`  Handler Start : ${handlerStartedAt.toISOString()}`);
                    if (delay > 0) {
                        console.log(`  Simulated Lag : ${delay}ms delay completed`);
                    }
                    console.log(`  Status        : Handled asynchronously without blocking API response`);
                    console.log("--------------------------------------------------");

                    this.recordEventLog(logEntry);
                } catch (err) {
                    // Forward error safely to the error event listener
                    this.emit("error", {
                        event: "task-created",
                        error: err,
                        taskData,
                        occurredAt: new Date(),
                    });
                }
            });
        });

        // --------------------------------------------------------------------
        // 2. EVENT: task-deleted
        // Supplementary Problem: Logs task deletion with distinct message format.
        // --------------------------------------------------------------------
        this.on("task-deleted", (taskData) => {
            // Asynchronously scheduled on next event loop tick
            setImmediate(() => {
                const handlerStartedAt = new Date();
                try {
                    const deletedBy =
                        taskData.deletedBy?.username ||
                        taskData.deletedBy?.email ||
                        taskData.deletedBy ||
                        "System User";

                    const taskTitle = taskData.title || "Untitled Task";
                    const deletedAt = taskData.deletedAt || handlerStartedAt;

                    const logEntry = {
                        event: "task-deleted",
                        taskId: taskData.taskId,
                        title: taskTitle,
                        deletedBy,
                        deletedAt: new Date(deletedAt),
                        handlerStartedAt,
                        handlerCompletedAt: new Date(),
                        durationMs: Date.now() - handlerStartedAt.getTime(),
                    };

                    console.log("--------------------------------------------------");
                    console.log(`[EVENT: task-deleted] Asynchronous Notification Triggered`);
                    console.log(`  Task Title    : "${taskTitle}"`);
                    console.log(`  Task ID       : ${taskData.taskId}`);
                    console.log(`  Deleted By    : ${deletedBy}`);
                    console.log(`  Deleted At    : ${new Date(deletedAt).toISOString()}`);
                    console.log(`  Handler Start : ${handlerStartedAt.toISOString()}`);
                    console.log(`  Status        : Deletion notification handled asynchronously`);
                    console.log("--------------------------------------------------");

                    this.recordEventLog(logEntry);
                } catch (err) {
                    this.emit("error", {
                        event: "task-deleted",
                        error: err,
                        taskData,
                        occurredAt: new Date(),
                    });
                }
            });
        });

        // --------------------------------------------------------------------
        // 3. EVENT: error
        // Supplementary Problem: Catches & logs any error inside handlers.
        // --------------------------------------------------------------------
        this.on("error", (errPayload) => {
            const error =
                errPayload instanceof Error
                    ? errPayload
                    : errPayload.error || new Error(String(errPayload));

            const sourceEvent = errPayload.event || "general";
            const occurredAt = errPayload.occurredAt || new Date();

            console.error("==================================================");
            console.error(`[EVENT: error] Caught Error in Listener for '${sourceEvent}'`);
            console.error(`  Error Message : ${error.message}`);
            if (errPayload.taskData) {
                console.error(`  Task Context  : ID=${errPayload.taskData.taskId || "N/A"}, Title="${errPayload.taskData.title || "N/A"}"`);
            }
            console.error(`  Logged At     : ${occurredAt.toISOString()}`);
            console.error("  Status        : Handled safely by error listener without process crash");
            console.error("==================================================");

            this.recordErrorLog({
                event: sourceEvent,
                message: error.message,
                stack: error.stack,
                taskData: errPayload.taskData,
                occurredAt,
            });
        });
    }
}

// Export singleton instance of TaskEventEmitter
const taskEventEmitter = new TaskEventEmitter();

module.exports = {
    TaskEventEmitter,
    taskEventEmitter,
};
