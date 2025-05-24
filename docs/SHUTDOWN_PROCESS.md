# Graceful Shutdown Process

This document details how the gitea-mirror application handles graceful shutdown during active mirroring operations, with specific focus on job interruption and recovery.

## Overview

The graceful shutdown system is designed for **fast, clean termination** without waiting for long-running jobs to complete. It prioritizes **quick shutdown times** (under 30 seconds) while **preserving all progress** for seamless recovery.

## Key Principle

**The application does NOT wait for jobs to finish before shutting down.** Instead, it saves the current state and resumes after restart.

## Shutdown Scenario Example

### Initial State
- **Job**: Mirror 500 repositories
- **Progress**: 200 repositories completed
- **Remaining**: 300 repositories pending
- **Action**: User initiates shutdown (SIGTERM, Ctrl+C, Docker stop)

### Shutdown Process (Under 30 seconds)

#### Step 1: Signal Detection (Immediate)
```
📡 Received SIGTERM signal
🛑 Graceful shutdown initiated by signal: SIGTERM
📊 Shutdown status: 1 active jobs, 2 callbacks
```

#### Step 2: Job State Saving (1-10 seconds)
```
📝 Step 1: Saving active job states...
Saving state for job abc-123...
✅ Saved state for job abc-123
```

**What gets saved:**
- `inProgress: false` - Mark job as not currently running
- `completedItems: 200` - Number of repos successfully mirrored
- `totalItems: 500` - Total repos in the job
- `completedItemIds: [repo1, repo2, ..., repo200]` - List of completed repos
- `itemIds: [repo1, repo2, ..., repo500]` - Full list of repos
- `lastCheckpoint: 2025-05-24T17:30:00Z` - Exact shutdown time
- `message: "Job interrupted by application shutdown - will resume on restart"`
- `status: "imported"` - Keeps status as resumable (not "failed")

#### Step 3: Service Cleanup (1-5 seconds)
```
🔧 Step 2: Executing shutdown callbacks...
🛑 Shutting down cleanup service...
✅ Cleanup service stopped
✅ Shutdown callback 1 completed
```

#### Step 4: Clean Exit (Immediate)
```
💾 Step 3: Closing database connections...
✅ Graceful shutdown completed successfully
```

**Total shutdown time: ~15 seconds** (well under the 30-second limit)

## What Happens to the Remaining 300 Repos?

### During Shutdown
- **NOT processed** - The remaining 300 repos are not mirrored
- **NOT lost** - Their IDs are preserved in the job state
- **NOT marked as failed** - Job status remains "imported" for recovery

### After Restart
The recovery system automatically:

1. **Detects interrupted job** during startup
2. **Calculates remaining work**: 500 - 200 = 300 repos
3. **Extracts remaining repo IDs**: repos 201-500 from the original list
4. **Resumes processing** from exactly where it left off
5. **Continues until completion** of all 500 repos

## Timeout Configuration

### Shutdown Timeouts
```typescript
const SHUTDOWN_TIMEOUT = 30000; // 30 seconds max shutdown time
const JOB_SAVE_TIMEOUT = 10000; // 10 seconds to save job state
```

### Timeout Behavior
- **Normal case**: Shutdown completes in 10-20 seconds
- **Slow database**: Up to 30 seconds allowed
- **Timeout exceeded**: Force exit with code 1
- **Container kill**: Orchestrator should allow 45+ seconds grace period

## Job State Persistence

### Database Schema
The `mirror_jobs` table stores complete job state:

```sql
-- Job identification
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
job_type TEXT NOT NULL DEFAULT 'mirror',

-- Progress tracking  
total_items INTEGER,
completed_items INTEGER DEFAULT 0,
item_ids TEXT, -- JSON array of all repo IDs
completed_item_ids TEXT DEFAULT '[]', -- JSON array of completed repo IDs

-- State management
in_progress INTEGER NOT NULL DEFAULT 0, -- Boolean: currently running
started_at TIMESTAMP,
completed_at TIMESTAMP,
last_checkpoint TIMESTAMP, -- Last progress save

-- Status and messaging
status TEXT NOT NULL DEFAULT 'imported',
message TEXT NOT NULL
```

### Recovery Query
The recovery system finds interrupted jobs:

```sql
SELECT * FROM mirror_jobs 
WHERE in_progress = 0 
  AND status = 'imported' 
  AND completed_at IS NULL
  AND total_items > completed_items;
```

## Shutdown-Aware Processing

### Concurrency Check
During job execution, each repo processing checks for shutdown:

```typescript
// Before processing each repository
if (isShuttingDown()) {
  throw new Error('Processing interrupted by application shutdown');
}
```

### Checkpoint Intervals
Jobs save progress periodically (every 10 repos by default):

```typescript
checkpointInterval: 10, // Save progress every 10 repositories
```

This ensures minimal work loss even if shutdown occurs between checkpoints.

## Container Integration

### Docker Entrypoint
The Docker entrypoint properly forwards signals:

```bash
# Set up signal handlers
trap 'shutdown_handler' TERM INT HUP

# Start application in background
bun ./dist/server/entry.mjs &
APP_PID=$!

# Wait for application to finish
wait "$APP_PID"
```

### Kubernetes Configuration
Recommended pod configuration:

```yaml
apiVersion: v1
kind: Pod
spec:
  terminationGracePeriodSeconds: 45  # Allow time for graceful shutdown
  containers:
  - name: gitea-mirror
    # ... other configuration
```

## Monitoring and Logging

### Shutdown Logs
```
🛑 Graceful shutdown initiated by signal: SIGTERM
📊 Shutdown status: 1 active jobs, 2 callbacks
📝 Step 1: Saving active job states...
Saving state for 1 active jobs...
✅ Completed saving all active jobs
🔧 Step 2: Executing shutdown callbacks...
✅ Completed all shutdown callbacks  
💾 Step 3: Closing database connections...
✅ Graceful shutdown completed successfully
```

### Recovery Logs
```
⚠️  Jobs found that need recovery. Starting recovery process...
Resuming job abc-123 with 300 remaining items...
✅ Recovery completed successfully
```

## Best Practices

### For Operations
1. **Monitor shutdown times** - Should complete under 30 seconds
2. **Check recovery logs** - Verify jobs resume correctly after restart
3. **Set appropriate grace periods** - Allow 45+ seconds in orchestrators
4. **Plan maintenance windows** - Jobs will resume but may take time to complete

### For Development
1. **Test shutdown scenarios** - Use `bun run test-shutdown`
2. **Monitor job progress** - Check checkpoint frequency and timing
3. **Verify recovery** - Ensure interrupted jobs resume correctly
4. **Handle edge cases** - Test shutdown during different job phases

## Troubleshooting

### Shutdown Takes Too Long
- **Check**: Database performance during job state saving
- **Solution**: Increase `SHUTDOWN_TIMEOUT` environment variable
- **Monitor**: Job complexity and checkpoint frequency

### Jobs Don't Resume
- **Check**: Recovery logs for errors during startup
- **Verify**: Database contains interrupted jobs with correct status
- **Test**: Run `bun run startup-recovery` manually

### Container Force-Killed
- **Check**: Container orchestrator termination grace period
- **Increase**: Grace period to 45+ seconds
- **Monitor**: Application shutdown completion time

This design ensures **production-ready graceful shutdown** with **zero data loss** and **fast recovery times** suitable for modern containerized deployments.
