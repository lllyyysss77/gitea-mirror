/**
 * Module registry implementation
 * Manages loading and access to modular features
 */

import type { 
  Module, 
  ModuleRegistry, 
  AppContext,
  RouteHandler,
  Middleware,
  DatabaseAdapter,
  EventEmitter
} from './types';
// Module registry for extensibility

/**
 * Simple event emitter implementation
 */
class SimpleEventEmitter implements EventEmitter {
  private events: Map<string, Set<Function>> = new Map();

  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }

  off(event: string, handler: (...args: any[]) => void): void {
    this.events.get(event)?.delete(handler);
  }

  emit(event: string, ...args: any[]): void {
    this.events.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
}

/**
 * Module manager class
 */
export class ModuleManager {
  private modules: Map<string, Module> = new Map();
  private routes: Map<string, RouteHandler> = new Map();
  private middlewares: Middleware[] = [];
  private events = new SimpleEventEmitter();
  private initialized = false;

  /**
   * Get app context for modules
   */
  private getAppContext(): AppContext {
    return {
      addRoute: (path, handler) => this.addRoute(path, handler),
      addMiddleware: (middleware) => this.middlewares.push(middleware),
      db: this.getDatabaseAdapter(),
      events: this.events,
      modules: this.getRegistry(),
    };
  }

  /**
   * Get database adapter based on deployment mode
   */
  private getDatabaseAdapter(): DatabaseAdapter {
    // This would be implemented to use SQLite or PostgreSQL
    // based on deployment mode
    return {
      query: async (sql, params) => [],
      execute: async (sql, params) => {},
      transaction: async (fn) => fn(),
    };
  }

  /**
   * Register a module
   */
  async register(module: Module): Promise<void> {
    if (this.modules.has(module.name)) {
      console.warn(`Module ${module.name} is already registered`);
      return;
    }

    try {
      await module.init(this.getAppContext());
      this.modules.set(module.name, module);
      console.log(`Module ${module.name} registered successfully`);
    } catch (error) {
      console.error(`Failed to register module ${module.name}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a module
   */
  async unregister(moduleName: string): Promise<void> {
    const module = this.modules.get(moduleName);
    if (!module) return;

    if (module.cleanup) {
      await module.cleanup();
    }
    
    this.modules.delete(moduleName);
    // Remove routes registered by this module
    // This would need to track which module registered which routes
  }

  /**
   * Add a route handler
   */
  private addRoute(path: string, handler: RouteHandler): void {
    this.routes.set(path, handler);
  }

  /**
   * Get route handler for a path
   */
  getRouteHandler(path: string): RouteHandler | null {
    return this.routes.get(path) || null;
  }

  /**
   * Get all middleware
   */
  getMiddleware(): Middleware[] {
    return [...this.middlewares];
  }

  /**
   * Get module registry
   */
  getRegistry(): ModuleRegistry {
    const registry: ModuleRegistry = {};
    
    // Copy all modules to registry
    for (const [name, module] of this.modules) {
      registry[name] = module;
    }
    
    return registry;
  }


  /**
   * Get a specific module
   */
  get<K extends keyof ModuleRegistry>(name: K): ModuleRegistry[K] | null {
    return this.getRegistry()[name] || null;
  }

  /**
   * Check if a module is loaded
   */
  has(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Emit an event to all modules
   */
  emit(event: string, ...args: any[]): void {
    this.events.emit(event, ...args);
  }
}

// Global module manager instance
export const modules = new ModuleManager();


// Initialize modules on app start
export async function initializeModules() {
  // Load core modules here if any
  
  // Emit initialization complete event
  modules.emit('modules:initialized');
}