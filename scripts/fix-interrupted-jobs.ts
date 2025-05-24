#!/usr/bin/env bun
/**
 * Script to fix interrupted jobs that might be preventing cleanup
 * This script marks all in-progress jobs as failed to allow them to be deleted
 *
 * Usage:
 *   bun scripts/fix-interrupted-jobs.ts [userId]
 *
 * Where [userId] is optional - if provided, only fixes jobs for that user
 */

import { db, mirrorJobs } from "../src/lib/db";
import { eq } from "drizzle-orm";

// Parse command line arguments
const args = process.argv.slice(2);
const userId = args.length > 0 ? args[0] : undefined;

async function fixInterruptedJobs() {
  try {
    console.log("Checking for interrupted jobs...");

    // Build the query
    let query = db
      .select()
      .from(mirrorJobs)
      .where(eq(mirrorJobs.inProgress, true));

    if (userId) {
      console.log(`Filtering for user: ${userId}`);
      query = query.where(eq(mirrorJobs.userId, userId));
    }

    // Find all in-progress jobs
    const inProgressJobs = await query;

    if (inProgressJobs.length === 0) {
      console.log("No interrupted jobs found.");
      return;
    }

    console.log(`Found ${inProgressJobs.length} interrupted jobs:`);
    inProgressJobs.forEach(job => {
      console.log(`- Job ${job.id}: ${job.message} (${job.repositoryName || job.organizationName || 'Unknown'})`);
    });

    // Mark all in-progress jobs as failed
    let updateQuery = db
      .update(mirrorJobs)
      .set({
        inProgress: false,
        completedAt: new Date(),
        status: "failed",
        message: "Job interrupted and marked as failed by cleanup script"
      })
      .where(eq(mirrorJobs.inProgress, true));

    if (userId) {
      updateQuery = updateQuery.where(eq(mirrorJobs.userId, userId));
    }

    await updateQuery;

    console.log(`✅ Successfully marked ${inProgressJobs.length} interrupted jobs as failed.`);
    console.log("These jobs can now be deleted through the normal cleanup process.");

  } catch (error) {
    console.error("Error fixing interrupted jobs:", error);
    process.exit(1);
  }
}

// Run the fix
fixInterruptedJobs();
