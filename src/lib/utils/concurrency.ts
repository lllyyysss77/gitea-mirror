/**
 * Utility for processing items in parallel with concurrency control
 *
 * @param items Array of items to process
 * @param processItem Function to process each item
 * @param concurrencyLimit Maximum number of concurrent operations
 * @param onProgress Optional callback for progress updates
 * @returns Promise that resolves when all items are processed
 */
export async function processInParallel<T, R>(
  items: T[],
  processItem: (item: T) => Promise<R>,
  concurrencyLimit: number = 5,
  onProgress?: (completed: number, total: number, result?: R) => void
): Promise<R[]> {
  const results: R[] = [];
  let completed = 0;
  const total = items.length;

  // Process items in batches to control concurrency
  for (let i = 0; i < total; i += concurrencyLimit) {
    const batch = items.slice(i, i + concurrencyLimit);

    const batchPromises = batch.map(async (item) => {
      try {
        const result = await processItem(item);
        completed++;

        if (onProgress) {
          onProgress(completed, total, result);
        }

        return result;
      } catch (error) {
        completed++;

        if (onProgress) {
          onProgress(completed, total);
        }

        throw error;
      }
    });

    // Wait for the current batch to complete before starting the next batch
    const batchResults = await Promise.allSettled(batchPromises);

    // Process results and handle errors
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('Error processing item:', result.reason);
      }
    }
  }

  return results;
}

/**
 * Utility for processing items in parallel with automatic retry for failed operations
 *
 * @param items Array of items to process
 * @param processItem Function to process each item
 * @param options Configuration options
 * @returns Promise that resolves when all items are processed
 */
export async function processWithRetry<T, R>(
  items: T[],
  processItem: (item: T) => Promise<R>,
  options: {
    concurrencyLimit?: number;
    maxRetries?: number;
    retryDelay?: number;
    onProgress?: (completed: number, total: number, result?: R) => void;
    onRetry?: (item: T, error: Error, attempt: number) => void;
    jobId?: string; // Optional job ID for checkpointing
    getItemId?: (item: T) => string; // Function to get a unique ID for each item
    onCheckpoint?: (jobId: string, completedItemId: string) => Promise<void>; // Callback for checkpointing
    checkpointInterval?: number; // How many items to process before checkpointing
  } = {}
): Promise<R[]> {
  const {
    concurrencyLimit = 5,
    maxRetries = 3,
    retryDelay = 1000,
    onProgress,
    onRetry,
    jobId,
    getItemId,
    onCheckpoint,
    checkpointInterval = 1 // Default to checkpointing after each item
  } = options;

  // Track checkpoint counter
  let itemsProcessedSinceLastCheckpoint = 0;

  // Wrap the process function with retry logic
  const processWithRetryLogic = async (item: T): Promise<R> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const result = await processItem(item);

        // Handle checkpointing if enabled
        if (jobId && getItemId && onCheckpoint) {
          const itemId = getItemId(item);
          itemsProcessedSinceLastCheckpoint++;

          // Checkpoint based on the interval
          if (itemsProcessedSinceLastCheckpoint >= checkpointInterval) {
            await onCheckpoint(jobId, itemId);
            itemsProcessedSinceLastCheckpoint = 0;
          }
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt <= maxRetries) {
          if (onRetry) {
            onRetry(item, lastError, attempt);
          }

          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw lastError;
        }
      }
    }

    // This should never be reached due to the throw in the catch block
    throw lastError || new Error('Unknown error occurred');
  };

  const results = await processInParallel(
    items,
    processWithRetryLogic,
    concurrencyLimit,
    onProgress
  );

  // Final checkpoint if there are remaining items since the last checkpoint
  if (jobId && getItemId && onCheckpoint && itemsProcessedSinceLastCheckpoint > 0) {
    // We don't have a specific item ID for the final checkpoint, so we'll use a placeholder
    await onCheckpoint(jobId, 'final');
  }

  return results;
}

/**
 * Process items in parallel with resilience to container restarts
 * This version supports resuming from a previous checkpoint
 */
export async function processWithResilience<T, R>(
  items: T[],
  processItem: (item: T) => Promise<R>,
  options: {
    concurrencyLimit?: number;
    maxRetries?: number;
    retryDelay?: number;
    onProgress?: (completed: number, total: number, result?: R) => void;
    onRetry?: (item: T, error: Error, attempt: number) => void;
    userId: string; // Required for creating mirror jobs
    jobType: "mirror" | "sync" | "retry";
    getItemId: (item: T) => string; // Required function to get a unique ID for each item
    getItemName: (item: T) => string; // Required function to get a display name for each item
    checkpointInterval?: number;
    resumeFromJobId?: string; // Optional job ID to resume from
  }
): Promise<R[]> {
  const {
    userId,
    jobType,
    getItemId,
    getItemName,
    resumeFromJobId,
    checkpointInterval = 5,
    ...otherOptions
  } = options;

  // Import helpers for job management
  const { createMirrorJob, updateMirrorJobProgress } = await import('@/lib/helpers');

  // Get item IDs for all items
  const allItemIds = items.map(getItemId);

  // Create or resume a job
  let jobId: string;
  let completedItemIds: string[] = [];
  let itemsToProcess = [...items];

  if (resumeFromJobId) {
    // We're resuming an existing job
    jobId = resumeFromJobId;

    // Get the job from the database to find completed items
    const { db, mirrorJobs } = await import('@/lib/db');
    const { eq } = await import('drizzle-orm');
    const [job] = await db
      .select()
      .from(mirrorJobs)
      .where(eq(mirrorJobs.id, resumeFromJobId));

    if (job && job.completedItemIds) {
      completedItemIds = job.completedItemIds;

      // Filter out already completed items
      itemsToProcess = items.filter(item => !completedItemIds.includes(getItemId(item)));

      console.log(`Resuming job ${jobId} with ${itemsToProcess.length} remaining items`);

      // Update the job to show it's being resumed
      await updateMirrorJobProgress({
        jobId,
        message: `Resuming job with ${itemsToProcess.length} remaining items`,
        details: `Job is being resumed. ${completedItemIds.length} of ${items.length} items were already processed.`,
        inProgress: true,
      });
    }
  } else {
    // Create a new job
    jobId = await createMirrorJob({
      userId,
      message: `Started ${jobType} job with ${items.length} items`,
      details: `Processing ${items.length} items in parallel with checkpointing`,
      status: "mirroring",
      jobType,
      totalItems: items.length,
      itemIds: allItemIds,
      inProgress: true,
    });

    console.log(`Created new job ${jobId} with ${items.length} items`);
  }

  // Define the checkpoint function
  const onCheckpoint = async (jobId: string, completedItemId: string) => {
    const itemName = items.find(item => getItemId(item) === completedItemId)
      ? getItemName(items.find(item => getItemId(item) === completedItemId)!)
      : 'unknown';

    await updateMirrorJobProgress({
      jobId,
      completedItemId,
      message: `Processed item: ${itemName}`,
    });
  };

  try {
    // Process the items with checkpointing
    const results = await processWithRetry(
      itemsToProcess,
      processItem,
      {
        ...otherOptions,
        jobId,
        getItemId,
        onCheckpoint,
        checkpointInterval,
      }
    );

    // Mark the job as completed
    await updateMirrorJobProgress({
      jobId,
      status: "mirrored",
      message: `Completed ${jobType} job with ${items.length} items`,
      inProgress: false,
      isCompleted: true,
    });

    return results;
  } catch (error) {
    // Mark the job as failed
    await updateMirrorJobProgress({
      jobId,
      status: "failed",
      message: `Failed ${jobType} job: ${error instanceof Error ? error.message : String(error)}`,
      inProgress: false,
      isCompleted: true,
    });

    throw error;
  }
}
