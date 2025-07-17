/**
 * Module system type definitions
 * These interfaces allow for extensibility and plugins
 */
import type { APIContext } from 'astro';
import type { ComponentType, LazyExoticComponent } from 'react';
/**
 * Base module interface that all modules must implement
 */
export interface Module {
    /** Unique module identifier */
    name: string;
    /** Module version */
    version: string;
    /** Initialize the module with app context */
    init(app: AppContext): Promise<void>;
    /** Cleanup when module is unloaded */
    cleanup?(): Promise<void>;
}
/**
 * Application context passed to modules
 */
export interface AppContext {
    /** Register API routes */
    addRoute(path: string, handler: RouteHandler): void;
    /** Register middleware */
    addMiddleware(middleware: Middleware): void;
    /** Access to database (abstracted) */
    db: DatabaseAdapter;
    /** Event emitter for cross-module communication */
    events: EventEmitter;
    /** Access to other modules */
    modules: ModuleRegistry;
}
/**
 * Route handler type
 */
export type RouteHandler = (context: APIContext) => Promise<Response> | Response;
/**
 * Middleware type
 */
export type Middleware = (context: APIContext, next: () => Promise<Response>) => Promise<Response>;
/**
 * Database adapter interface (abstract away implementation)
 */
export interface DatabaseAdapter {
    query<T>(sql: string, params?: any[]): Promise<T[]>;
    execute(sql: string, params?: any[]): Promise<void>;
    transaction<T>(fn: () => Promise<T>): Promise<T>;
}
/**
 * Event emitter for cross-module communication
 */
export interface EventEmitter {
    on(event: string, handler: (...args: any[]) => void): void;
    off(event: string, handler: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
}
/**
 * Example module interfaces
 * These are examples of how modules can be structured
 */
export interface FeatureModule extends Module {
    /** React components provided by the module */
    components?: Record<string, LazyExoticComponent<ComponentType<any>>>;
    /** API methods provided by the module */
    api?: Record<string, (...args: any[]) => Promise<any>>;
    /** Lifecycle hooks */
    hooks?: {
        onInit?: () => Promise<void>;
        onUserAction?: (action: string, data: any) => Promise<void>;
    };
}
/**
 * Module registry interface
 */
export interface ModuleRegistry {
    [key: string]: Module | undefined;
}
export interface User {
    id: string;
    email: string;
    name?: string;
    username?: string;
}
//# sourceMappingURL=types.d.ts.map