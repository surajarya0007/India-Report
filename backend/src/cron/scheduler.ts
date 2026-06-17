import cron from 'node-cron';
import { runIngestionPipeline } from '../controllers/ingestionController';

/**
 * Initializes the node-cron scheduler.
 * Registers a task that runs every 15 minutes to pull new articles.
 */
export function initScheduler() {
  console.log('[Scheduler] Initializing news ingestion task...');

  // '*/15 * * * *' executes every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Cron event triggered: Running ingestion pipeline...');
    try {
      const stats = await runIngestionPipeline();
      console.log(`[Scheduler] Cron event execution complete. Ingested: ${stats.ingestedCount}, Skipped: ${stats.skippedCount}`);
    } catch (error) {
      console.error('[Scheduler] Cron event failed to execute successfully:', error);
    }
  });

  console.log('[Scheduler] Cron task registered successfully.');
}
