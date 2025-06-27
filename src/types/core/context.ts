import { z } from 'zod';
import { SessionId } from './agent';
import { TaskId } from './task';

export interface ExecutionContext {
  readonly sessionId: SessionId;
  readonly taskId?: TaskId;
  readonly workingDirectory: string;
  readonly environment: EnvironmentContext;
  readonly permissions: PermissionContext;
  readonly resources: ResourceContext;
  readonly traceId?: string;
  readonly spanId?: string;
}

export interface EnvironmentContext {
  readonly variables: Record<string, string>;
  readonly platform: NodeJS.Platform;
  readonly nodeVersion: string;
  readonly timezone: string;
  readonly locale: string;
}

export interface PermissionContext {
  readonly fileSystem: FileSystemPermissions;
  readonly network: NetworkPermissions;
  readonly process: ProcessPermissions;
  readonly tools: ToolPermissions;
}

export interface FileSystemPermissions {
  readonly read: boolean;
  readonly write: boolean;
  readonly execute: boolean;
  readonly allowedPaths?: string[];
  readonly deniedPaths?: string[];
}

export interface NetworkPermissions {
  readonly httpRequests: boolean;
  readonly allowedDomains?: string[];
  readonly deniedDomains?: string[];
  readonly maxRequestsPerMinute?: number;
}

export interface ProcessPermissions {
  readonly spawn: boolean;
  readonly kill: boolean;
  readonly allowedCommands?: string[];
  readonly deniedCommands?: string[];
}

export interface ToolPermissions {
  readonly allowedTools?: string[];
  readonly deniedTools?: string[];
  readonly customTools?: boolean;
}

export interface ResourceContext {
  readonly memory: MemoryLimits;
  readonly cpu: CPULimits;
  readonly storage: StorageLimits;
  readonly time: TimeLimits;
}

export interface MemoryLimits {
  readonly maxHeapSize?: number;
  readonly maxRssSize?: number;
}

export interface CPULimits {
  readonly maxCpuPercent?: number;
  readonly cpuQuota?: number;
}

export interface StorageLimits {
  readonly maxFileSize?: number;
  readonly maxTotalSize?: number;
  readonly maxFileCount?: number;
}

export interface TimeLimits {
  readonly maxExecutionTime?: number;
  readonly maxIdleTime?: number;
  readonly timeout?: number;
}

export interface RequestContext {
  readonly id: string;
  readonly timestamp: Date;
  readonly source: 'api' | 'cli' | 'web' | 'internal';
  readonly user?: UserContext;
  readonly session?: SessionContext;
  readonly metadata?: Record<string, unknown>;
}

export interface UserContext {
  readonly id: string;
  readonly email?: string;
  readonly roles?: string[];
  readonly permissions?: string[];
}

export interface SessionContext {
  readonly id: string;
  readonly createdAt: Date;
  readonly expiresAt?: Date;
  readonly data?: Record<string, unknown>;
}

export const ExecutionContextSchema = z.object({
  sessionId: z.string(),
  taskId: z.string().optional(),
  workingDirectory: z.string(),
  environment: z.object({
    variables: z.record(z.string()),
    platform: z.string(),
    nodeVersion: z.string(),
    timezone: z.string(),
    locale: z.string()
  }),
  permissions: z.object({
    fileSystem: z.object({
      read: z.boolean(),
      write: z.boolean(),
      execute: z.boolean(),
      allowedPaths: z.array(z.string()).optional(),
      deniedPaths: z.array(z.string()).optional()
    }),
    network: z.object({
      httpRequests: z.boolean(),
      allowedDomains: z.array(z.string()).optional(),
      deniedDomains: z.array(z.string()).optional(),
      maxRequestsPerMinute: z.number().optional()
    }),
    process: z.object({
      spawn: z.boolean(),
      kill: z.boolean(),
      allowedCommands: z.array(z.string()).optional(),
      deniedCommands: z.array(z.string()).optional()
    }),
    tools: z.object({
      allowedTools: z.array(z.string()).optional(),
      deniedTools: z.array(z.string()).optional(),
      customTools: z.boolean().optional()
    })
  }),
  resources: z.object({
    memory: z.object({
      maxHeapSize: z.number().optional(),
      maxRssSize: z.number().optional()
    }),
    cpu: z.object({
      maxCpuPercent: z.number().optional(),
      cpuQuota: z.number().optional()
    }),
    storage: z.object({
      maxFileSize: z.number().optional(),
      maxTotalSize: z.number().optional(),
      maxFileCount: z.number().optional()
    }),
    time: z.object({
      maxExecutionTime: z.number().optional(),
      maxIdleTime: z.number().optional(),
      timeout: z.number().optional()
    })
  }),
  traceId: z.string().optional(),
  spanId: z.string().optional()
});