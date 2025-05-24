#!/usr/bin/env bun
/**
 * Test script for the recovery system
 * This script creates test jobs and verifies that the recovery system can handle them
 *
 * Usage:
 *   bun scripts/test-recovery.ts [--cleanup]
 *
 * Options:
 *   --cleanup: Clean up test jobs after testing
 */

import { db, mirrorJobs } from "../src/lib/db";
import { createMirrorJob } from "../src/lib/helpers";
import { initializeRecovery, hasJobsNeedingRecovery, getRecoveryStatus } from "../src/lib/recovery";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Parse command line arguments
const args = process.argv.slice(2);
const cleanup = args.includes('--cleanup');

// Test configuration
const TEST_USER_ID = "test-user-recovery";
const TEST_BATCH_ID = "test-batch-recovery";

async function runRecoveryTest() {
  console.log('=== Recovery System Test ===');
  console.log(`Cleanup mode: ${cleanup}`);
  console.log('');

  try {
    if (cleanup) {
      await cleanupTestJobs();
      return;
    }

    // Step 1: Create test jobs that simulate interrupted state
    console.log('Step 1: Creating test interrupted jobs...');
    await createTestInterruptedJobs();

    // Step 2: Check if recovery system detects them
    console.log('Step 2: Checking if recovery system detects interrupted jobs...');
    const needsRecovery = await hasJobsNeedingRecovery();
    console.log(`Jobs needing recovery: ${needsRecovery}`);

    if (!needsRecovery) {
      console.log('❌ Recovery system did not detect interrupted jobs');
      return;
    }

    // Step 3: Get recovery status
    console.log('Step 3: Getting recovery status...');
    const status = getRecoveryStatus();
    console.log('Recovery status:', status);

    // Step 4: Run recovery
    console.log('Step 4: Running recovery...');
    const recoveryResult = await initializeRecovery({
      skipIfRecentAttempt: false,
      maxRetries: 2,
      retryDelay: 2000,
    });

    console.log(`Recovery result: ${recoveryResult}`);

    // Step 5: Verify recovery completed
    console.log('Step 5: Verifying recovery completed...');
    const stillNeedsRecovery = await hasJobsNeedingRecovery();
    console.log(`Jobs still needing recovery: ${stillNeedsRecovery}`);

    // Step 6: Check final job states
    console.log('Step 6: Checking final job states...');
    await checkTestJobStates();

    console.log('');
    console.log('✅ Recovery test completed successfully!');
    console.log('Run with --cleanup to remove test jobs');

  } catch (error) {
    console.error('❌ Recovery test failed:', error);
    process.exit(1);
  }
}

/**
 * Create test jobs that simulate interrupted state
 */
async function createTestInterruptedJobs() {
  const testJobs = [
    {
      repositoryId: uuidv4(),
      repositoryName: "test-repo-1",
      message: "Test mirror job 1",
      status: "mirroring" as const,
      jobType: "mirror" as const,
    },
    {
      repositoryId: uuidv4(),
      repositoryName: "test-repo-2", 
      message: "Test sync job 2",
      status: "syncing" as const,
      jobType: "sync" as const,
    },
  ];

  for (const job of testJobs) {
    const jobId = await createMirrorJob({
      userId: TEST_USER_ID,
      repositoryId: job.repositoryId,
      repositoryName: job.repositoryName,
      message: job.message,
      status: job.status,
      jobType: job.jobType,
      batchId: TEST_BATCH_ID,
      totalItems: 5,
      itemIds: [job.repositoryId, uuidv4(), uuidv4(), uuidv4(), uuidv4()],
      inProgress: true,
      skipDuplicateEvent: true,
    });

    // Manually set the job to look interrupted (old timestamp)
    const oldTimestamp = new Date();
    oldTimestamp.setMinutes(oldTimestamp.getMinutes() - 15); // 15 minutes ago

    await db
      .update(mirrorJobs)
      .set({
        startedAt: oldTimestamp,
        lastCheckpoint: oldTimestamp,
      })
      .where(eq(mirrorJobs.id, jobId));

    console.log(`Created test job: ${jobId} (${job.repositoryName})`);
  }
}

/**
 * Check the final states of test jobs
 */
async function checkTestJobStates() {
  const testJobs = await db
    .select()
    .from(mirrorJobs)
    .where(eq(mirrorJobs.userId, TEST_USER_ID));

  console.log(`Found ${testJobs.length} test jobs:`);
  
  for (const job of testJobs) {
    console.log(`- Job ${job.id}: ${job.status} (inProgress: ${job.inProgress})`);
    console.log(`  Message: ${job.message}`);
    console.log(`  Started: ${job.startedAt ? new Date(job.startedAt).toISOString() : 'never'}`);
    console.log(`  Completed: ${job.completedAt ? new Date(job.completedAt).toISOString() : 'never'}`);
    console.log('');
  }
}

/**
 * Clean up test jobs
 */
async function cleanupTestJobs() {
  console.log('Cleaning up test jobs...');
  
  const result = await db
    .delete(mirrorJobs)
    .where(eq(mirrorJobs.userId, TEST_USER_ID));

  console.log('✅ Test jobs cleaned up successfully');
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Test interrupted by SIGINT');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test interrupted by SIGTERM');
  process.exit(143);
});

// Run the test
runRecoveryTest();
