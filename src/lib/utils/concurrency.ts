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
  } = {}
): Promise<R[]> {
  const {
    concurrencyLimit = 5,
    maxRetries = 3,
    retryDelay = 1000,
    onProgress,
    onRetry
  } = options;

  // Wrap the process function with retry logic
  const processWithRetryLogic = async (item: T): Promise<R> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await processItem(item);
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

  return processInParallel(
    items,
    processWithRetryLogic,
    concurrencyLimit,
    onProgress
  );
}
