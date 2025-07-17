/**
 * Real-time event system using EventEmitter
 * For the self-hosted version
 */

import { EventEmitter } from 'events';

export interface RealtimeEvent {
  type: string;
  userId?: string;
  data: any;
  timestamp: number;
}

/**
 * Real-time event bus for local instance
 */
export class RealtimeEventBus extends EventEmitter {
  private channels = new Map<string, Set<(event: RealtimeEvent) => void>>();
  private userChannels = new Map<string, string[]>();

  constructor() {
    super();
  }

  /**
   * Handle incoming events
   */
  private handleIncomingEvent(channel: string, event: RealtimeEvent) {
    // Emit to local listeners
    this.emit(channel, event);
    
    // Call channel-specific handlers
    const handlers = this.channels.get(channel);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, handler?: (event: RealtimeEvent) => void) {
    // Add handler if provided
    if (handler) {
      if (!this.channels.has(channel)) {
        this.channels.set(channel, new Set());
      }
      this.channels.get(channel)!.add(handler);
    }

    // Add local listener
    if (!this.listenerCount(channel)) {
      this.on(channel, (event) => this.handleIncomingEvent(channel, event));
    }
  }

  /**
   * Subscribe to user-specific channels
   */
  async subscribeUser(userId: string) {
    const channels = [
      `user:${userId}`,
      `user:${userId}:notifications`,
      `user:${userId}:updates`,
    ];

    this.userChannels.set(userId, channels);

    for (const channel of channels) {
      await this.subscribe(channel);
    }
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string, handler?: (event: RealtimeEvent) => void) {
    // Remove handler if provided
    if (handler) {
      this.channels.get(channel)?.delete(handler);
      
      // Remove channel if no handlers left
      if (this.channels.get(channel)?.size === 0) {
        this.channels.delete(channel);
      }
    }

    // Remove local listener if no handlers
    if (!this.channels.has(channel)) {
      this.removeAllListeners(channel);
    }
  }

  /**
   * Unsubscribe from user channels
   */
  async unsubscribeUser(userId: string) {
    const channels = this.userChannels.get(userId) || [];
    
    for (const channel of channels) {
      await this.unsubscribe(channel);
    }
    
    this.userChannels.delete(userId);
  }

  /**
   * Publish an event
   */
  async publish(channel: string, event: Omit<RealtimeEvent, 'timestamp'>) {
    const fullEvent: RealtimeEvent = {
      ...event,
      timestamp: Date.now(),
    };

    // Emit locally
    this.handleIncomingEvent(channel, fullEvent);
  }

  /**
   * Broadcast to all users
   */
  async broadcast(event: Omit<RealtimeEvent, 'timestamp'>) {
    await this.publish('broadcast', event);
  }

  /**
   * Send event to specific user
   */
  async sendToUser(userId: string, event: Omit<RealtimeEvent, 'timestamp' | 'userId'>) {
    await this.publish(`user:${userId}`, {
      ...event,
      userId,
    });
  }

  /**
   * Send activity update
   */
  async sendActivity(activity: {
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    details?: any;
  }) {
    const event = {
      type: 'activity',
      data: activity,
    };

    // Send to user
    await this.sendToUser(activity.userId, event);

    // Also publish to activity channel
    await this.publish('activity', {
      ...event,
      userId: activity.userId,
    });
  }

  /**
   * Get event statistics
   */
  getStats() {
    return {
      channels: this.channels.size,
      listeners: Array.from(this.channels.values()).reduce(
        (sum, handlers) => sum + handlers.size,
        0
      ),
      userChannels: this.userChannels.size,
    };
  }
}

// Global event bus instance
export const eventBus = new RealtimeEventBus();

/**
 * React hook for subscribing to events
 */
export function useRealtimeEvents(
  channel: string,
  handler: (event: RealtimeEvent) => void,
  deps: any[] = []
) {
  if (typeof window !== 'undefined') {
    const { useEffect } = require('react');
    
    useEffect(() => {
      eventBus.subscribe(channel, handler);
      
      return () => {
        eventBus.unsubscribe(channel, handler);
      };
    }, deps);
  }
}

/**
 * Server-sent events endpoint handler
 */
export async function createSSEHandler(userId: string) {
  const encoder = new TextEncoder();
  
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      );

      // Subscribe to user channels
      await eventBus.subscribeUser(userId);

      // Create event handler
      const handleEvent = (event: RealtimeEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      // Subscribe to channels
      eventBus.on(`user:${userId}`, handleEvent);

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30000);

      // Cleanup on close
      return () => {
        clearInterval(heartbeat);
        eventBus.off(`user:${userId}`, handleEvent);
        eventBus.unsubscribeUser(userId);
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}