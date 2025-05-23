#!/usr/bin/env bun
/**
 * Script to clean up old mirror jobs from the database
 * This script should be run periodically (e.g., daily) to prevent the mirror_jobs table from growing too large
 *
 * Usage:
 *   bun scripts/cleanup-mirror-jobs.ts [days]
 *
 * Where [days] is the number of days to keep mirror jobs (default: 7)
 */

import { db, mirrorJobs } from "../src/lib/db";
import { lt, and, eq } from "drizzle-orm";

// Parse command line arguments
const args = process.argv.slice(2);
const daysToKeep = args.length > 0 ? parseInt(args[0], 10) : 7;

if (isNaN(daysToKeep) || daysToKeep < 1) {
  console.error("Error: Days to keep must be a positive number");
  process.exit(1);
}

/**
 * Cleans up old mirror jobs to prevent the database from growing too large
 * Should be called periodically (e.g., daily via a cron job)
 *
 * @param maxAgeInDays Number of days to keep mirror jobs (default: 7)
 * @returns Object containing the number of completed and in-progress jobs deleted
 */
async function cleanupOldMirrorJobs(
  maxAgeInDays: number = 7
): Promise<{ completedJobsDeleted: number; inProgressJobsDeleted: number }> {
  try {
    console.log(`Cleaning up mirror jobs older than ${maxAgeInDays} days...`);

    // Calculate the cutoff date for completed jobs
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

    // Delete completed jobs older than the cutoff date
    // Only delete jobs that are not in progress (inProgress = false)
    const completedResult = await db
      .delete(mirrorJobs)
      .where(
        and(
          eq(mirrorJobs.inProgress, false),
          lt(mirrorJobs.timestamp, cutoffDate)
        )
      );

    const completedJobsDeleted = completedResult.changes || 0;
    console.log(`Deleted ${completedJobsDeleted} completed mirror jobs`);

    // Calculate a much older cutoff date for in-progress jobs (3x the retention period)
    // This is to handle jobs that might have been abandoned or crashed
    const inProgressCutoffDate = new Date();
    inProgressCutoffDate.setDate(inProgressCutoffDate.getDate() - (maxAgeInDays * 3));

    // Delete in-progress jobs that are significantly older
    // This helps clean up jobs that might have been abandoned due to crashes
    const inProgressResult = await db
      .delete(mirrorJobs)
      .where(
        and(
          eq(mirrorJobs.inProgress, true),
          lt(mirrorJobs.timestamp, inProgressCutoffDate)
        )
      );

    const inProgressJobsDeleted = inProgressResult.changes || 0;
    console.log(`Deleted ${inProgressJobsDeleted} abandoned in-progress mirror jobs`);

    return { completedJobsDeleted, inProgressJobsDeleted };
  } catch (error) {
    console.error("Error cleaning up old mirror jobs:", error);
    return { completedJobsDeleted: 0, inProgressJobsDeleted: 0 };
  }
}

// Run the cleanup
async function runCleanup() {
  try {
    console.log(`Starting mirror jobs cleanup (retention: ${daysToKeep} days)...`);

    // Call the cleanupOldMirrorJobs function
    const result = await cleanupOldMirrorJobs(daysToKeep);

    console.log(`Cleanup summary:`);
    console.log(`- Completed jobs deleted: ${result.completedJobsDeleted}`);
    console.log(`- Abandoned in-progress jobs deleted: ${result.inProgressJobsDeleted}`);
    console.log(`- Total jobs deleted: ${result.completedJobsDeleted + result.inProgressJobsDeleted}`);

    console.log("Mirror jobs cleanup completed successfully");
  } catch (error) {
    console.error("Error running mirror jobs cleanup:", error);
    process.exit(1);
  }
}

// Run the cleanup
runCleanup();
