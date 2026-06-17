"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScheduler = initScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const ingestionController_1 = require("../controllers/ingestionController");
/**
 * Initializes the node-cron scheduler.
 * Registers a task that runs every 15 minutes to pull new articles.
 */
function initScheduler() {
    console.log('[Scheduler] Initializing news ingestion task...');
    // '*/15 * * * *' executes every 15 minutes
    node_cron_1.default.schedule('*/15 * * * *', async () => {
        console.log('[Scheduler] Cron event triggered: Running ingestion pipeline...');
        try {
            const stats = await (0, ingestionController_1.runIngestionPipeline)();
            console.log(`[Scheduler] Cron event execution complete. Ingested: ${stats.ingestedCount}, Skipped: ${stats.skippedCount}`);
        }
        catch (error) {
            console.error('[Scheduler] Cron event failed to execute successfully:', error);
        }
    });
    console.log('[Scheduler] Cron task registered successfully.');
}
