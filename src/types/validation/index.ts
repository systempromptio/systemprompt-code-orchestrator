import { z } from 'zod';
import { 
  AgentProviderSchema,
  AgentStatusSchema,
  QueryContextSchema,
  SessionStatusSchema,
  SessionConfigSchema,
  TaskStatusSchema,
  TaskPrioritySchema,
  TaskTypeSchema,
  ClaudeConfigSchema,
  GeminiConfigSchema,
  ApiResponseSchema,
  CreateSessionRequestSchema,
  CreateTaskRequestSchema,
  QueryAgentRequestSchema
} from '../index.js';

/**
 * Central validation registry
 */
export class ValidationRegistry {
  private static schemas = new Map<string, z.ZodSchema<unknown>>();
  
  static {
    // Register all schemas
    this.register('agent.provider', AgentProviderSchema);
    this.register('agent.status', AgentStatusSchema);
    this.register('agent.queryContext', QueryContextSchema);
    this.register('session.status', SessionStatusSchema);
    this.register('session.config', SessionConfigSchema);
    this.register('task.status', TaskStatusSchema);
    this.register('task.priority', TaskPrioritySchema);
    this.register('task.type', TaskTypeSchema);
    this.register('provider.claude.config', ClaudeConfigSchema);
    this.register('provider.gemini.config', GeminiConfigSchema);
    this.register('api.response', ApiResponseSchema);
    this.register('api.request.createSession', CreateSessionRequestSchema);
    this.register('api.request.createTask', CreateTaskRequestSchema);
    this.register('api.request.queryAgent', QueryAgentRequestSchema);
  }
  
  /**
   * Register a schema
   */
  static register<T>(name: string, schema: z.ZodSchema<T>): void {
    this.schemas.set(name, schema);
  }
  
  /**
   * Get a schema by name
   */
  static get(name: string): z.ZodSchema<unknown> | undefined {
    return this.schemas.get(name);
  }
  
  /**
   * Validate data against a schema
   */
  static validate<T>(name: string, data: unknown): T {
    const schema = this.get(name);
    if (!schema) {
      throw new Error(`Schema '${name}' not found`);
    }
    return schema.parse(data) as T;
  }
  
  /**
   * Safe validate (returns result instead of throwing)
   */
  static safeValidate<T>(name: string, data: unknown): z.SafeParseReturnType<unknown, T> {
    const schema = this.get(name);
    if (!schema) {
      return {
        success: false,
        error: new z.ZodError([{
          code: 'custom',
          message: `Schema '${name}' not found`,
          path: []
        }])
      } as z.SafeParseReturnType<unknown, T>;
    }
    return schema.safeParse(data) as z.SafeParseReturnType<unknown, T>;
  }
  
  /**
   * List all registered schemas
   */
  static list(): string[] {
    return Array.from(this.schemas.keys()).sort();
  }
}

// For middleware, we'll use a generic interface instead of Express types
// to avoid coupling to a specific framework
interface Request {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

interface Response {
  status(code: number): Response;
  json(data: unknown): void;
}

type NextFunction = () => void;

/**
 * Validation middleware for body
 */
export function validateBody(schemaName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = ValidationRegistry.safeValidate(schemaName, req.body);
    
    if (!result.success) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          validationErrors: result.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            value: undefined,
            constraint: e.code
          }))
        }
      });
      return;
    }
    
    req.body = result.data;
    next();
  };
}

/**
 * Validation middleware for query parameters
 */
export function validateQuery(schemaName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = ValidationRegistry.safeValidate(schemaName, req.query);
    
    if (!result.success) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter validation failed',
          validationErrors: result.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            value: undefined,
            constraint: e.code
          }))
        }
      });
      return;
    }
    
    req.query = result.data;
    next();
  };
}

/**
 * Validation middleware for path parameters
 */
export function validateParams(schemaName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = ValidationRegistry.safeValidate(schemaName, req.params);
    
    if (!result.success) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Path parameter validation failed',
          validationErrors: result.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            value: undefined,
            constraint: e.code
          }))
        }
      });
      return;
    }
    
    req.params = result.data;
    next();
  };
}

/**
 * Combined validation middleware
 */
export interface ValidationOptions {
  body?: string;
  query?: string;
  params?: string;
}

interface ValidationError {
  location: string;
  field: string;
  message: string;
  constraint: string;
}

export function validate(options: ValidationOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = [];
    
    if (options.body) {
      const result = ValidationRegistry.safeValidate(options.body, req.body);
      if (!result.success) {
        errors.push(...result.error.errors.map(e => ({
          location: 'body',
          field: e.path.join('.'),
          message: e.message,
          constraint: e.code
        })));
      } else {
        req.body = result.data;
      }
    }
    
    if (options.query) {
      const result = ValidationRegistry.safeValidate(options.query, req.query);
      if (!result.success) {
        errors.push(...result.error.errors.map(e => ({
          location: 'query',
          field: e.path.join('.'),
          message: e.message,
          constraint: e.code
        })));
      } else {
        req.query = result.data;
      }
    }
    
    if (options.params) {
      const result = ValidationRegistry.safeValidate(options.params, req.params);
      if (!result.success) {
        errors.push(...result.error.errors.map(e => ({
          location: 'params',
          field: e.path.join('.'),
          message: e.message,
          constraint: e.code
        })));
      } else {
        req.params = result.data;
      }
    }
    
    if (errors.length > 0) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          validationErrors: errors
        }
      });
      return;
    }
    
    next();
  };
}

// Export validation utilities
export { z } from 'zod';