import { z } from 'zod';
import { AgentProvider } from '../core/agent';
import { TaskPriority, TaskType } from '../core/task';

export interface ApiRequest<T = unknown> {
  readonly headers: RequestHeaders;
  readonly params?: Record<string, string>;
  readonly query?: Record<string, string | string[]>;
  readonly body?: T;
  readonly context: RequestContext;
}

export interface RequestHeaders {
  readonly authorization?: string;
  readonly contentType?: string;
  readonly accept?: string;
  readonly userAgent?: string;
  readonly traceId?: string;
  readonly [key: string]: string | undefined;
}

export interface RequestContext {
  readonly requestId: string;
  readonly timestamp: Date;
  readonly method: string;
  readonly path: string;
  readonly ip?: string;
  readonly user?: RequestUser;
}

export interface RequestUser {
  readonly id: string;
  readonly email?: string;
  readonly roles?: string[];
}

export interface PaginationParams {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  readonly search?: string;
  readonly filters?: Record<string, unknown>;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
}

export interface CreateSessionRequest {
  readonly provider: AgentProvider;
  readonly config?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

export interface CreateTaskRequest {
  readonly sessionId: string;
  readonly type: TaskType;
  readonly priority: TaskPriority;
  readonly title: string;
  readonly description: string;
  readonly assignedTo?: AgentProvider;
  readonly parentTaskId?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface UpdateTaskRequest {
  readonly status?: string;
  readonly priority?: TaskPriority;
  readonly title?: string;
  readonly description?: string;
  readonly assignedTo?: AgentProvider;
  readonly metadata?: Record<string, unknown>;
}

export interface QueryAgentRequest {
  readonly sessionId: string;
  readonly prompt: string;
  readonly context?: Record<string, unknown>;
  readonly options?: QueryOptions;
}

export interface QueryOptions {
  readonly streaming?: boolean;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly tools?: string[];
  readonly timeout?: number;
}

export const PaginationParamsSchema = z.object({
  page: z.coerce.number().positive().optional().default(1),
  pageSize: z.coerce.number().positive().max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

export const FilterParamsSchema = z.object({
  search: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
});

export const CreateSessionRequestSchema = z.object({
  provider: z.enum(['claude', 'gemini', 'custom']),
  config: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const CreateTaskRequestSchema = z.object({
  sessionId: z.string(),
  type: z.enum(['query', 'code_generation', 'code_review', 'refactoring', 'testing', 'documentation', 'custom']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1).max(255),
  description: z.string(),
  assignedTo: z.enum(['claude', 'gemini', 'custom']).optional(),
  parentTaskId: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const UpdateTaskRequestSchema = z.object({
  status: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  assignedTo: z.enum(['claude', 'gemini', 'custom']).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const QueryAgentRequestSchema = z.object({
  sessionId: z.string(),
  prompt: z.string().min(1),
  context: z.record(z.unknown()).optional(),
  options: z.object({
    streaming: z.boolean().optional(),
    maxTokens: z.number().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
    tools: z.array(z.string()).optional(),
    timeout: z.number().positive().optional()
  }).optional()
});

export function parsePaginationParams(query: Record<string, unknown>): PaginationParams {
  return PaginationParamsSchema.parse(query);
}

export function parseFilterParams(query: Record<string, unknown>): FilterParams {
  return FilterParamsSchema.parse(query);
}

export function validateCreateSessionRequest(data: unknown): CreateSessionRequest {
  return CreateSessionRequestSchema.parse(data);
}

export function validateCreateTaskRequest(data: unknown): CreateTaskRequest {
  return CreateTaskRequestSchema.parse(data);
}

export function validateUpdateTaskRequest(data: unknown): UpdateTaskRequest {
  return UpdateTaskRequestSchema.parse(data);
}

export function validateQueryAgentRequest(data: unknown): QueryAgentRequest {
  return QueryAgentRequestSchema.parse(data);
}