import { defineMiddleware } from 'astro:middleware';
import { initializeRecovery, hasJobsNeedingRecovery, getRecoveryStatus } from './lib/recovery';

// Flag to track if recovery has been initialized
let recoveryInitialized = false;
let recoveryAttempted = false;

export const onRequest = defineMiddleware(async (context, next) => {
  // Initialize recovery system only once when the server starts
  // This is a fallback in case the startup script didn't run
  if (!recoveryInitialized && !recoveryAttempted) {
    recoveryAttempted = true;

    try {
      // Check if recovery is actually needed before attempting
      const needsRecovery = await hasJobsNeedingRecovery();

      if (needsRecovery) {
        console.log('⚠️  Middleware detected jobs needing recovery (startup script may not have run)');
        console.log('Attempting recovery from middleware...');

        // Run recovery with a shorter timeout since this is during request handling
        const recoveryResult = await Promise.race([
          initializeRecovery({
            skipIfRecentAttempt: true,
            maxRetries: 2,
            retryDelay: 3000,
          }),
          new Promise<boolean>((_, reject) => {
            setTimeout(() => reject(new Error('Middleware recovery timeout')), 15000);
          })
        ]);

        if (recoveryResult) {
          console.log('✅ Middleware recovery completed successfully');
        } else {
          console.log('⚠️  Middleware recovery completed with some issues');
        }
      } else {
        console.log('✅ No recovery needed (startup script likely handled it)');
      }

      recoveryInitialized = true;
    } catch (error) {
      console.error('⚠️  Middleware recovery failed or timed out:', error);
      console.log('Application will continue, but some jobs may remain interrupted');

      // Log recovery status for debugging
      const status = getRecoveryStatus();
      console.log('Recovery status:', status);

      recoveryInitialized = true; // Mark as attempted to avoid retries
    }
  }

  // Continue with the request
  return next();
});
