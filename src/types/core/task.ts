import { z } from 'zod';
import { AgentProvider } from './agent';
import { SessionId } from './session';

export type TaskId = string & { readonly __brand: 'TaskId' };
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'query' | 'code_generation' | 'code_review' | 'refactoring' | 'testing' | 'documentation' | 'custom';

export const createTaskId = (id: string): TaskId => id as TaskId;

export interface Task {
  readonly id: TaskId;
  readonly sessionId: SessionId;
  readonly type: TaskType;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly title: string;
  readonly description: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly assignedTo?: AgentProvider;
  readonly parentTaskId?: TaskId;
  readonly subtasks?: TaskId[];
  readonly dependencies?: TaskId[];
  readonly result?: TaskResult;
  readonly metadata: TaskMetadata;
}

export interface TaskResult {
  readonly success: boolean;
  readonly output?: unknown;
  readonly error?: TaskError;
  readonly artifacts?: TaskArtifact[];
  readonly metrics?: TaskMetrics;
}

export interface TaskError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly recoverable: boolean;
}

export interface TaskArtifact {
  readonly id: string;
  readonly type: 'file' | 'code' | 'log' | 'report' | 'other';
  readonly name: string;
  readonly path?: string;
  readonly content?: string;
  readonly mimeType?: string;
  readonly size?: number;
}

export interface TaskMetrics {
  readonly duration: number;
  readonly tokensUsed?: number;
  readonly retries?: number;
  readonly cpuTime?: number;
  readonly memoryUsed?: number;
}

export interface TaskMetadata {
  readonly tags?: string[];
  readonly labels?: Record<string, string>;
  readonly context?: Record<string, unknown>;
  readonly aiContext?: AITaskContext;
  readonly timeout?: number;
}

export interface AITaskContext {
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly tools?: string[];
  readonly systemPrompt?: string;
}

export interface TaskFilter {
  readonly sessionId?: SessionId;
  readonly status?: TaskStatus | TaskStatus[];
  readonly priority?: TaskPriority | TaskPriority[];
  readonly type?: TaskType | TaskType[];
  readonly assignedTo?: AgentProvider;
  readonly parentTaskId?: TaskId;
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly tags?: string[];
}

export interface TaskUpdate {
  readonly status?: TaskStatus;
  readonly priority?: TaskPriority;
  readonly title?: string;
  readonly description?: string;
  readonly assignedTo?: AgentProvider;
  readonly result?: TaskResult;
  readonly metadata?: Partial<TaskMetadata>;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
}

export interface TaskManager {
  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  getTask(id: TaskId): Promise<Task | null>;
  updateTask(id: TaskId, updates: TaskUpdate): Promise<Task>;
  deleteTask(id: TaskId): Promise<void>;
  listTasks(filter?: TaskFilter): Promise<Task[]>;
  getTaskTree(rootId: TaskId): Promise<TaskTreeNode>;
}

export interface TaskTreeNode {
  readonly task: Task;
  readonly children: TaskTreeNode[];
}

export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']);
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const TaskTypeSchema = z.enum(['query', 'code_generation', 'code_review', 'refactoring', 'testing', 'documentation', 'custom']);

export const TaskSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  type: TaskTypeSchema,
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  title: z.string(),
  description: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  assignedTo: z.string().optional(),
  parentTaskId: z.string().optional(),
  subtasks: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  result: z.object({
    success: z.boolean(),
    output: z.unknown().optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
      recoverable: z.boolean()
    }).optional(),
    artifacts: z.array(z.object({
      id: z.string(),
      type: z.enum(['file', 'code', 'log', 'report', 'other']),
      name: z.string(),
      path: z.string().optional(),
      content: z.string().optional(),
      mimeType: z.string().optional(),
      size: z.number().optional()
    })).optional(),
    metrics: z.object({
      duration: z.number(),
      tokensUsed: z.number().optional(),
      retries: z.number().optional(),
      cpuTime: z.number().optional(),
      memoryUsed: z.number().optional()
    }).optional()
  }).optional(),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    labels: z.record(z.string()).optional(),
    context: z.record(z.unknown()).optional(),
    aiContext: z.object({
      model: z.string().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
      tools: z.array(z.string()).optional(),
      systemPrompt: z.string().optional()
    }).optional()
  })
});