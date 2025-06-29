/**
 * @file Orchestrator tool type definitions
 * @module handlers/tools/orchestrator/utils/types
 */

import { z } from 'zod';
import { Task, AIToolSchema } from '../../../../types/task.js';

// ==================== Tool Argument Schemas ====================

export const CreateTaskArgsSchema = z.object({
  title: z.string().min(1).max(200),
  tool: AIToolSchema,
  instructions: z.string().min(1).max(10000),
  branch: z.string().min(1).max(100)
});
export type CreateTaskArgs = z.infer<typeof CreateTaskArgsSchema>;

export const UpdateTaskArgsSchema = z.object({
  process: z.string(),
  instructions: z.string().min(1).max(10000)
});
export type UpdateTaskArgs = z.infer<typeof UpdateTaskArgsSchema>;

export const EndTaskArgsSchema = z.object({
  task_id: z.string(),
  status: z.enum(['completed', 'failed', 'cancelled'])
});
export type EndTaskArgs = z.infer<typeof EndTaskArgsSchema>;

export const ReportTaskArgsSchema = z.object({
  id: z.string().optional()
});
export type ReportTaskArgs = z.infer<typeof ReportTaskArgsSchema>;

export const CleanStateArgsSchema = z.object({
  keep_recent: z.boolean().default(true),
  hours: z.number().positive().default(24),
  dry_run: z.boolean().default(false)
});
export type CleanStateArgs = z.infer<typeof CleanStateArgsSchema>;

export const CheckStatusArgsSchema = z.object({
  verbose: z.boolean().default(false),
  include_tasks: z.boolean().default(false)
});
export type CheckStatusArgs = z.infer<typeof CheckStatusArgsSchema>;

// ==================== Response Types ====================

export interface ToolResponse<T = unknown> {
  readonly success: boolean;
  readonly message: string;
  readonly data?: T;
  readonly error?: {
    readonly type: string;
    readonly details?: unknown;
  };
}

// ==================== Session Types ====================

export interface SessionContext {
  readonly sessionId?: string;
  readonly userId?: string;
  readonly requestId?: string;
}

// ==================== Error Types ====================

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

export class ToolNotAvailableError extends Error {
  constructor(tool: string) {
    super(`Tool not available: ${tool}`);
    this.name = 'ToolNotAvailableError';
  }
}

export class GitOperationError extends Error {
  constructor(
    operation: string,
    public readonly details?: unknown
  ) {
    super(`Git operation failed: ${operation}`);
    this.name = 'GitOperationError';
  }
}

export class StatusCheckError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'StatusCheckError';
  }
}

// ==================== Task Report Types ====================

export interface TaskReport {
  readonly task: Task;
  readonly duration: string;
  readonly logCount: number;
  readonly summary: string;
}