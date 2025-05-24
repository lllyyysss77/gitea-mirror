/**
 * Background cleanup service for automatic database maintenance
 * This service runs periodically to clean up old events and mirror jobs
 * based on user configuration settings
 */

import { db, configs, events, mirrorJobs } from "@/lib/db";
import { eq, lt, and } from "drizzle-orm";

interface CleanupResult {
  userId: string;
  eventsDeleted: number;
  mirrorJobsDeleted: number;
  error?: string;
}

/**
 * Clean up old events and mirror jobs for a specific user
 */
async function cleanupForUser(userId: string, retentionDays: number): Promise<CleanupResult> {
  try {
    console.log(`Running cleanup for user ${userId} with ${retentionDays} days retention`);

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let eventsDeleted = 0;
    let mirrorJobsDeleted = 0;

    // Clean up old events
    const eventsResult = await db
      .delete(events)
      .where(
        and(
          eq(events.userId, userId),
          lt(events.createdAt, cutoffDate)
        )
      );
    eventsDeleted = eventsResult.changes || 0;

    // Clean up old mirror jobs (only completed ones)
    const jobsResult = await db
      .delete(mirrorJobs)
      .where(
        and(
          eq(mirrorJobs.userId, userId),
          eq(mirrorJobs.inProgress, false),
          lt(mirrorJobs.timestamp, cutoffDate)
        )
      );
    mirrorJobsDeleted = jobsResult.changes || 0;

    console.log(`Cleanup completed for user ${userId}: ${eventsDeleted} events, ${mirrorJobsDeleted} jobs deleted`);

    return {
      userId,
      eventsDeleted,
      mirrorJobsDeleted,
    };
  } catch (error) {
    console.error(`Error during cleanup for user ${userId}:`, error);
    return {
      userId,
      eventsDeleted: 0,
      mirrorJobsDeleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update the cleanup configuration with last run time and calculate next run
 */
async function updateCleanupConfig(userId: string, cleanupConfig: any) {
  try {
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day

    const updatedConfig = {
      ...cleanupConfig,
      lastRun: now,
      nextRun: nextRun,
    };

    await db
      .update(configs)
      .set({
        cleanupConfig: updatedConfig,
        updatedAt: now,
      })
      .where(eq(configs.userId, userId));

    console.log(`Updated cleanup config for user ${userId}, next run: ${nextRun.toISOString()}`);
  } catch (error) {
    console.error(`Error updating cleanup config for user ${userId}:`, error);
  }
}

/**
 * Run automatic cleanup for all users with cleanup enabled
 */
export async function runAutomaticCleanup(): Promise<CleanupResult[]> {
  try {
    console.log('Starting automatic cleanup service...');

    // Get all users with cleanup enabled
    const userConfigs = await db
      .select()
      .from(configs)
      .where(eq(configs.isActive, true));

    const results: CleanupResult[] = [];
    const now = new Date();

    for (const config of userConfigs) {
      try {
        const cleanupConfig = config.cleanupConfig;
        
        // Skip if cleanup is not enabled
        if (!cleanupConfig?.enabled) {
          continue;
        }

        // Check if it's time to run cleanup
        const nextRun = cleanupConfig.nextRun ? new Date(cleanupConfig.nextRun) : null;
        
        // If nextRun is null or in the past, run cleanup
        if (!nextRun || now >= nextRun) {
          const result = await cleanupForUser(config.userId, cleanupConfig.retentionDays || 7);
          results.push(result);

          // Update the cleanup config with new run times
          await updateCleanupConfig(config.userId, cleanupConfig);
        } else {
          console.log(`Skipping cleanup for user ${config.userId}, next run: ${nextRun.toISOString()}`);
        }
      } catch (error) {
        console.error(`Error processing cleanup for user ${config.userId}:`, error);
        results.push({
          userId: config.userId,
          eventsDeleted: 0,
          mirrorJobsDeleted: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`Automatic cleanup completed. Processed ${results.length} users.`);
    return results;
  } catch (error) {
    console.error('Error in automatic cleanup service:', error);
    return [];
  }
}

/**
 * Start the cleanup service with periodic execution
 * This should be called when the application starts
 */
export function startCleanupService() {
  console.log('Starting background cleanup service...');

  // Run cleanup every hour
  const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

  // Run initial cleanup after 5 minutes to allow app to fully start
  setTimeout(() => {
    runAutomaticCleanup().catch(error => {
      console.error('Error in initial cleanup run:', error);
    });
  }, 5 * 60 * 1000); // 5 minutes

  // Set up periodic cleanup
  setInterval(() => {
    runAutomaticCleanup().catch(error => {
      console.error('Error in periodic cleanup run:', error);
    });
  }, CLEANUP_INTERVAL);

  console.log(`✅ Cleanup service started. Will run every ${CLEANUP_INTERVAL / 1000 / 60} minutes.`);
}

/**
 * Stop the cleanup service (for testing or shutdown)
 */
export function stopCleanupService() {
  // Note: In a real implementation, you'd want to track the interval ID
  // and clear it here. For now, this is a placeholder.
  console.log('Cleanup service stop requested (not implemented)');
}
