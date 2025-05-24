/**
 * Signal Handlers for Graceful Shutdown
 * 
 * This module sets up proper signal handling for container environments.
 * It ensures the application responds correctly to SIGTERM, SIGINT, and other signals.
 */

import { gracefulShutdown, isShuttingDown } from './shutdown-manager';

// Track if signal handlers have been registered
let signalHandlersRegistered = false;

/**
 * Setup signal handlers for graceful shutdown
 * This should be called early in the application lifecycle
 */
export function setupSignalHandlers(): void {
  if (signalHandlersRegistered) {
    console.log('⚠️  Signal handlers already registered, skipping');
    return;
  }

  console.log('🔧 Setting up signal handlers for graceful shutdown...');

  // Handle SIGTERM (Docker stop, Kubernetes termination)
  process.on('SIGTERM', () => {
    console.log('\n📡 Received SIGTERM signal');
    if (!isShuttingDown()) {
      gracefulShutdown('SIGTERM').catch((error) => {
        console.error('Error during SIGTERM shutdown:', error);
        process.exit(1);
      });
    }
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    console.log('\n📡 Received SIGINT signal');
    if (!isShuttingDown()) {
      gracefulShutdown('SIGINT').catch((error) => {
        console.error('Error during SIGINT shutdown:', error);
        process.exit(1);
      });
    }
  });

  // Handle SIGHUP (terminal hangup)
  process.on('SIGHUP', () => {
    console.log('\n📡 Received SIGHUP signal');
    if (!isShuttingDown()) {
      gracefulShutdown('SIGHUP').catch((error) => {
        console.error('Error during SIGHUP shutdown:', error);
        process.exit(1);
      });
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('\n💥 Uncaught Exception:', error);
    console.error('Stack trace:', error.stack);
    
    if (!isShuttingDown()) {
      console.log('Initiating emergency shutdown due to uncaught exception...');
      gracefulShutdown('UNCAUGHT_EXCEPTION').catch((shutdownError) => {
        console.error('Error during emergency shutdown:', shutdownError);
        process.exit(1);
      });
    } else {
      // If already shutting down, force exit
      console.error('Uncaught exception during shutdown, forcing exit');
      process.exit(1);
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('\n💥 Unhandled Promise Rejection at:', promise);
    console.error('Reason:', reason);
    
    if (!isShuttingDown()) {
      console.log('Initiating emergency shutdown due to unhandled rejection...');
      gracefulShutdown('UNHANDLED_REJECTION').catch((shutdownError) => {
        console.error('Error during emergency shutdown:', shutdownError);
        process.exit(1);
      });
    } else {
      // If already shutting down, force exit
      console.error('Unhandled rejection during shutdown, forcing exit');
      process.exit(1);
    }
  });

  // Handle process warnings (for debugging)
  process.on('warning', (warning) => {
    console.warn('⚠️  Process Warning:', warning.name);
    console.warn('Message:', warning.message);
    if (warning.stack) {
      console.warn('Stack:', warning.stack);
    }
  });

  signalHandlersRegistered = true;
  console.log('✅ Signal handlers registered successfully');
}

/**
 * Remove signal handlers (for testing)
 */
export function removeSignalHandlers(): void {
  if (!signalHandlersRegistered) {
    return;
  }

  console.log('🔧 Removing signal handlers...');
  
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGHUP');
  process.removeAllListeners('uncaughtException');
  process.removeAllListeners('unhandledRejection');
  process.removeAllListeners('warning');
  
  signalHandlersRegistered = false;
  console.log('✅ Signal handlers removed');
}

/**
 * Check if signal handlers are registered
 */
export function areSignalHandlersRegistered(): boolean {
  return signalHandlersRegistered;
}

/**
 * Send a test signal to the current process (for testing)
 */
export function sendTestSignal(signal: NodeJS.Signals = 'SIGTERM'): void {
  console.log(`🧪 Sending test signal: ${signal}`);
  process.kill(process.pid, signal);
}
