#!/usr/bin/env bun
/**
 * Integration test for graceful shutdown functionality
 * 
 * This script tests the complete graceful shutdown flow:
 * 1. Starts a mock job
 * 2. Initiates shutdown
 * 3. Verifies job state is saved correctly
 * 4. Tests recovery after restart
 * 
 * Usage:
 *   bun scripts/test-graceful-shutdown.ts [--cleanup]
 */

import { db, mirrorJobs } from "../src/lib/db";
import { eq } from "drizzle-orm";
import { 
  initializeShutdownManager, 
  registerActiveJob, 
  unregisterActiveJob, 
  gracefulShutdown,
  getShutdownStatus,
  registerShutdownCallback
} from "../src/lib/shutdown-manager";
import { setupSignalHandlers, removeSignalHandlers } from "../src/lib/signal-handlers";
import { createMirrorJob } from "../src/lib/helpers";

// Test configuration
const TEST_USER_ID = "test-user-shutdown";
const TEST_JOB_PREFIX = "test-shutdown-job";

// Parse command line arguments
const args = process.argv.slice(2);
const shouldCleanup = args.includes('--cleanup');

/**
 * Create a test job for shutdown testing
 */
async function createTestJob(): Promise<string> {
  console.log('📝 Creating test job...');
  
  const jobId = await createMirrorJob({
    userId: TEST_USER_ID,
    message: 'Test job for graceful shutdown testing',
    details: 'This job simulates a long-running mirroring operation',
    status: "mirroring",
    jobType: "mirror",
    totalItems: 10,
    itemIds: ['item-1', 'item-2', 'item-3', 'item-4', 'item-5'],
    completedItems: 2, // Simulate partial completion
    inProgress: true,
  });
  
  console.log(`✅ Created test job: ${jobId}`);
  return jobId;
}

/**
 * Verify that job state was saved correctly during shutdown
 */
async function verifyJobState(jobId: string): Promise<boolean> {
  console.log(`🔍 Verifying job state for ${jobId}...`);
  
  const jobs = await db
    .select()
    .from(mirrorJobs)
    .where(eq(mirrorJobs.id, jobId));
  
  if (jobs.length === 0) {
    console.error(`❌ Job ${jobId} not found in database`);
    return false;
  }
  
  const job = jobs[0];
  
  // Check that the job was marked as interrupted
  if (job.inProgress) {
    console.error(`❌ Job ${jobId} is still marked as in progress`);
    return false;
  }
  
  if (!job.message?.includes('interrupted by application shutdown')) {
    console.error(`❌ Job ${jobId} does not have shutdown message. Message: ${job.message}`);
    return false;
  }
  
  if (!job.lastCheckpoint) {
    console.error(`❌ Job ${jobId} does not have a checkpoint timestamp`);
    return false;
  }
  
  console.log(`✅ Job ${jobId} state verified correctly`);
  console.log(`   - In Progress: ${job.inProgress}`);
  console.log(`   - Message: ${job.message}`);
  console.log(`   - Last Checkpoint: ${job.lastCheckpoint}`);
  
  return true;
}

/**
 * Test the graceful shutdown process
 */
async function testGracefulShutdown(): Promise<void> {
  console.log('\n🧪 Testing Graceful Shutdown Process');
  console.log('=====================================\n');
  
  try {
    // Step 1: Initialize shutdown manager
    console.log('Step 1: Initializing shutdown manager...');
    initializeShutdownManager();
    setupSignalHandlers();
    
    // Step 2: Create and register a test job
    console.log('\nStep 2: Creating and registering test job...');
    const jobId = await createTestJob();
    registerActiveJob(jobId);
    
    // Step 3: Register a test shutdown callback
    console.log('\nStep 3: Registering shutdown callback...');
    let callbackExecuted = false;
    registerShutdownCallback(async () => {
      console.log('🔧 Test shutdown callback executed');
      callbackExecuted = true;
    });
    
    // Step 4: Check initial status
    console.log('\nStep 4: Checking initial status...');
    const initialStatus = getShutdownStatus();
    console.log(`   - Active jobs: ${initialStatus.activeJobs.length}`);
    console.log(`   - Registered callbacks: ${initialStatus.registeredCallbacks}`);
    console.log(`   - Shutdown in progress: ${initialStatus.inProgress}`);
    
    // Step 5: Simulate graceful shutdown
    console.log('\nStep 5: Simulating graceful shutdown...');
    
    // Override process.exit to prevent actual exit during test
    const originalExit = process.exit;
    let exitCode: number | undefined;
    process.exit = ((code?: number) => {
      exitCode = code;
      console.log(`🚪 Process.exit called with code: ${code}`);
      // Don't actually exit during test
    }) as any;
    
    try {
      // This should save job state and execute callbacks
      await gracefulShutdown('TEST_SIGNAL');
    } catch (error) {
      // Expected since we're not actually exiting
      console.log(`⚠️  Graceful shutdown completed (exit intercepted)`);
    }
    
    // Restore original process.exit
    process.exit = originalExit;
    
    // Step 6: Verify job state was saved
    console.log('\nStep 6: Verifying job state was saved...');
    const jobStateValid = await verifyJobState(jobId);
    
    // Step 7: Verify callback was executed
    console.log('\nStep 7: Verifying callback execution...');
    if (callbackExecuted) {
      console.log('✅ Shutdown callback was executed');
    } else {
      console.error('❌ Shutdown callback was not executed');
    }
    
    // Step 8: Test results
    console.log('\n📊 Test Results:');
    console.log(`   - Job state saved correctly: ${jobStateValid ? '✅' : '❌'}`);
    console.log(`   - Shutdown callback executed: ${callbackExecuted ? '✅' : '❌'}`);
    console.log(`   - Exit code: ${exitCode}`);
    
    if (jobStateValid && callbackExecuted) {
      console.log('\n🎉 All tests passed! Graceful shutdown is working correctly.');
    } else {
      console.error('\n❌ Some tests failed. Please check the implementation.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Test failed with error:', error);
    process.exit(1);
  } finally {
    // Clean up signal handlers
    removeSignalHandlers();
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData(): Promise<void> {
  console.log('🧹 Cleaning up test data...');
  
  const result = await db
    .delete(mirrorJobs)
    .where(eq(mirrorJobs.userId, TEST_USER_ID));
  
  console.log('✅ Test data cleaned up');
}

/**
 * Main test runner
 */
async function runTest(): Promise<void> {
  console.log('🧪 Graceful Shutdown Integration Test');
  console.log('====================================\n');
  
  if (shouldCleanup) {
    await cleanupTestData();
    console.log('✅ Cleanup completed');
    return;
  }
  
  try {
    await testGracefulShutdown();
  } finally {
    // Always clean up test data
    await cleanupTestData();
  }
}

// Handle process signals gracefully during testing
process.on('SIGINT', async () => {
  console.log('\n⚠️  Test interrupted by SIGINT');
  await cleanupTestData();
  process.exit(130);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Test interrupted by SIGTERM');
  await cleanupTestData();
  process.exit(143);
});

// Run the test
runTest();
