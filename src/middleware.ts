import { defineMiddleware } from 'astro:middleware';
import { initializeRecovery } from './lib/recovery';

// Flag to track if recovery has been initialized
let recoveryInitialized = false;

export const onRequest = defineMiddleware(async (context, next) => {
  // Initialize recovery system only once when the server starts
  if (!recoveryInitialized) {
    console.log('Initializing recovery system from middleware...');
    try {
      await initializeRecovery();
      console.log('Recovery system initialized successfully');
    } catch (error) {
      console.error('Error initializing recovery system:', error);
    }
    recoveryInitialized = true;
  }
  
  // Continue with the request
  return next();
});
