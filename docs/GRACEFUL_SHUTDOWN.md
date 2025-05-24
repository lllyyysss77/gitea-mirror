# Graceful Shutdown and Enhanced Job Recovery

This document describes the graceful shutdown and enhanced job recovery capabilities implemented in gitea-mirror v2.8.0+.

## Overview

The gitea-mirror application now includes comprehensive graceful shutdown handling and enhanced job recovery mechanisms designed specifically for containerized environments. These features ensure:

- **No data loss** during container restarts or shutdowns
- **Automatic job resumption** after application restarts
- **Clean termination** of all active processes and connections
- **Container-aware design** optimized for Docker/LXC deployments

## Features

### 1. Graceful Shutdown Manager

The shutdown manager (`src/lib/shutdown-manager.ts`) provides centralized coordination of application termination:

#### Key Capabilities:
- **Active Job Tracking**: Monitors all running mirroring/sync jobs
- **State Persistence**: Saves job progress to database before shutdown
- **Callback System**: Allows services to register cleanup functions
- **Timeout Protection**: Prevents hanging shutdowns with configurable timeouts
- **Signal Coordination**: Works with signal handlers for proper container lifecycle

#### Configuration:
- **Shutdown Timeout**: 30 seconds maximum (configurable)
- **Job Save Timeout**: 10 seconds per job (configurable)

### 2. Signal Handlers

The signal handler system (`src/lib/signal-handlers.ts`) ensures proper response to container lifecycle events:

#### Supported Signals:
- **SIGTERM**: Docker stop, Kubernetes pod termination
- **SIGINT**: Ctrl+C, manual interruption
- **SIGHUP**: Terminal hangup, service reload
- **Uncaught Exceptions**: Emergency shutdown on critical errors
- **Unhandled Rejections**: Graceful handling of promise failures

### 3. Enhanced Job Recovery

Building on the existing recovery system, new enhancements include:

#### Shutdown-Aware Processing:
- Jobs check for shutdown signals during execution
- Automatic state saving when shutdown is detected
- Proper job status management (interrupted vs failed)

#### Container Integration:
- Docker entrypoint script forwards signals correctly
- Startup recovery runs before main application
- Recovery timeouts prevent startup delays

## Usage

### Basic Operation

The graceful shutdown system is automatically initialized when the application starts. No manual configuration is required for basic operation.

### Testing

Test the graceful shutdown functionality:

```bash
# Run the integration test
bun run test-shutdown

# Clean up test data
bun run test-shutdown-cleanup

# Run unit tests
bun test src/lib/shutdown-manager.test.ts
bun test src/lib/signal-handlers.test.ts
```

### Manual Testing

1. **Start the application**:
   ```bash
   bun run dev
   # or in production
   bun run start
   ```

2. **Start a mirroring job** through the web interface

3. **Send shutdown signal**:
   ```bash
   # Send SIGTERM (recommended)
   kill -TERM <process_id>
   
   # Or use Ctrl+C for SIGINT
   ```

4. **Verify job state** is saved and can be resumed on restart

### Container Testing

Test with Docker:

```bash
# Build and run container
docker build -t gitea-mirror .
docker run -d --name test-shutdown gitea-mirror

# Start a job, then stop container
docker stop test-shutdown

# Restart and verify recovery
docker start test-shutdown
docker logs test-shutdown
```

## Implementation Details

### Shutdown Flow

1. **Signal Reception**: Signal handlers detect termination request
2. **Shutdown Initiation**: Shutdown manager begins graceful termination
3. **Job State Saving**: All active jobs save current progress to database
4. **Service Cleanup**: Registered callbacks stop background services
5. **Connection Cleanup**: Database connections and resources are released
6. **Process Termination**: Application exits with appropriate code

### Job State Management

During shutdown, active jobs are updated with:
- `inProgress: false` - Mark as not currently running
- `lastCheckpoint: <timestamp>` - Record shutdown time
- `message: "Job interrupted by application shutdown - will resume on restart"`
- Status remains as `"imported"` (not `"failed"`) to enable recovery

### Recovery Integration

The existing recovery system automatically detects and resumes interrupted jobs:
- Jobs with `inProgress: false` and incomplete status are candidates for recovery
- Recovery runs during application startup (before serving requests)
- Jobs resume from their last checkpoint with remaining items

## Configuration

### Environment Variables

```bash
# Optional: Adjust shutdown timeout (default: 30000ms)
SHUTDOWN_TIMEOUT=30000

# Optional: Adjust job save timeout (default: 10000ms)
JOB_SAVE_TIMEOUT=10000
```

### Docker Configuration

The Docker entrypoint script includes proper signal handling:

```dockerfile
# Signals are forwarded to the application process
# SIGTERM is handled gracefully with 30-second timeout
# Container stops cleanly without force-killing processes
```

### Kubernetes Configuration

For Kubernetes deployments, configure appropriate termination grace period:

```yaml
apiVersion: v1
kind: Pod
spec:
  terminationGracePeriodSeconds: 45  # Allow time for graceful shutdown
  containers:
  - name: gitea-mirror
    # ... other configuration
```

## Monitoring and Debugging

### Logs

The application provides detailed logging during shutdown:

```
🛑 Graceful shutdown initiated by signal: SIGTERM
📊 Shutdown status: 2 active jobs, 1 callbacks
📝 Step 1: Saving active job states...
Saving state for job abc-123...
✅ Saved state for job abc-123
🔧 Step 2: Executing shutdown callbacks...
✅ Shutdown callback 1 completed
💾 Step 3: Closing database connections...
✅ Graceful shutdown completed successfully
```

### Status Endpoints

Check shutdown manager status via API:

```bash
# Get current status (if application is running)
curl http://localhost:4321/api/health
```

### Troubleshooting

**Problem**: Jobs not resuming after restart
- **Check**: Startup recovery logs for errors
- **Verify**: Database contains interrupted jobs with correct status
- **Test**: Run `bun run startup-recovery` manually

**Problem**: Shutdown timeout reached
- **Check**: Job complexity and database performance
- **Adjust**: Increase `SHUTDOWN_TIMEOUT` environment variable
- **Monitor**: Database connection and disk I/O during shutdown

**Problem**: Container force-killed
- **Check**: Container orchestrator termination grace period
- **Adjust**: Increase grace period to allow shutdown completion
- **Monitor**: Application shutdown logs for timing issues

## Best Practices

### Development
- Always test graceful shutdown during development
- Use the provided test scripts to verify functionality
- Monitor logs for shutdown timing and job state persistence

### Production
- Set appropriate container termination grace periods
- Monitor shutdown logs for performance issues
- Use health checks to verify application readiness after restart
- Consider job complexity when planning maintenance windows

### Monitoring
- Track job recovery success rates
- Monitor shutdown duration metrics
- Alert on forced terminations or recovery failures
- Log analysis for shutdown pattern optimization

## Future Enhancements

Planned improvements for future versions:

1. **Configurable Timeouts**: Environment variable configuration for all timeouts
2. **Shutdown Metrics**: Prometheus metrics for shutdown performance
3. **Progressive Shutdown**: Graceful degradation of service capabilities
4. **Job Prioritization**: Priority-based job saving during shutdown
5. **Health Check Integration**: Readiness probes during shutdown process
