/**
 * @file Unified Task type definitions
 * @module types/task
 *
 * @remarks
 * This is the single source of truth for all Task-related types in the application.
 * Modern, slim, and type-safe with no backwards compatibility cruft.
 */

import { z } from "zod";
import type { SessionId } from "./core/session.js";

// ==================== Base Enums ====================

export const TaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const AIToolSchema = z.enum(["CLAUDECODE", "GEMINICLI"]);
export type AITool = z.infer<typeof AIToolSchema>;

export const TaskTypeSchema = z.enum([
  "query",
  "code_generation",
  "code_review",
  "refactoring",
  "testing",
  "documentation",
  "custom",
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

// ==================== Branded Types ====================

export type TaskId = string & { readonly __brand: "TaskId" };
export const createTaskId = (id: string): TaskId => id as TaskId;

// ==================== Core Task Interface ====================

/**
 * Core Task interface - slim and focused
 */
export interface Task {
  readonly id: TaskId;
  readonly description: string;
  readonly status: TaskStatus;
  readonly tool: AITool;
  readonly created_at: string;
  readonly updated_at: string;
  readonly started_at?: string;
  readonly completed_at?: string;
  readonly assigned_to?: string;
  readonly error?: string;
  readonly result?: unknown;
  readonly logs: string[];
}

// ==================== Task Schema for Validation ====================

export const TaskSchema = z.object({
  id: z.string(),
  description: z.string().min(1).max(5000),
  status: TaskStatusSchema,
  tool: AIToolSchema,
  created_at: z.string(),
  updated_at: z.string(),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  assigned_to: z.string().optional(),
  error: z.string().optional(),
  result: z.unknown().optional(),
  logs: z.array(z.string()).default([]),
});

export type ValidatedTask = z.infer<typeof TaskSchema>;

// ==================== Task Result ====================

export interface TaskResult {
  readonly success: boolean;
  readonly output?: unknown;
  readonly error?: string;
}

// ==================== Task Creation & Update ====================

export interface CreateTaskParams {
  description: string;
  tool: AITool;
}

export interface UpdateTaskParams {
  status?: TaskStatus;
  started_at?: string;
  completed_at?: string;
  assigned_to?: string;
  error?: string;
  result?: unknown;
}

// ==================== Process Task for Execution ====================

export interface ProcessTask extends Task {
  readonly sessionId: SessionId;
  readonly type: TaskType;
  readonly projectPath: string;
  readonly parentTaskId?: TaskId;
  readonly metadata?: Record<string, unknown>;
  readonly instructions?: string;
  readonly systemPrompt?: string;
}

export interface ProcessTaskParams {
  id?: TaskId;
  description?: string;
  tool: AITool;
  sessionId: SessionId;
  type: TaskType;
  projectPath?: string;
  parentTaskId?: TaskId;
  metadata?: Record<string, unknown>;
  instructions?: string;
  systemPrompt?: string;
}

// ==================== Task Management ====================

export interface TaskFilter {
  readonly status?: TaskStatus | TaskStatus[];
  readonly tool?: AITool | AITool[];
  readonly assignedTo?: string;
  readonly createdAfter?: string;
  readonly createdBefore?: string;
  readonly search?: string;
}

export interface TaskStats {
  readonly total: number;
  readonly byStatus: Record<TaskStatus, number>;
  readonly byTool: Record<AITool, number>;
  readonly averageDuration: number;
  readonly successRate: number;
}

// ==================== Type Guards ====================

export function isTask(value: unknown): value is Task {
  return TaskSchema.safeParse(value).success;
}

export function isProcessTask(value: unknown): value is ProcessTask {
  return isTask(value) && "sessionId" in value && "type" in value && "projectPath" in value;
}

// ==================== Type Converters ====================

export function createTask(params: CreateTaskParams): Task {
  const now = new Date().toISOString();
  return {
    id: createTaskId(`task_${Date.now()}`),
    description: params.description,
    tool: params.tool,
    status: "pending",
    created_at: now,
    updated_at: now,
    logs: [],
  };
}

export function createProcessTask(params: ProcessTaskParams): ProcessTask {
  const now = new Date().toISOString();
  const id =
    params.id || createTaskId(`task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  return {
    id,
    description:
      params.description || (params.instructions ? params.instructions.substring(0, 200) : "Task"),
    status: "pending",
    tool: params.tool,
    created_at: now,
    updated_at: now,
    logs: [],
    sessionId: params.sessionId,
    type: params.type,
    projectPath: params.projectPath || "",
    parentTaskId: params.parentTaskId,
    metadata: params.metadata,
    instructions: params.instructions,
    systemPrompt: params.systemPrompt,
  };
}
