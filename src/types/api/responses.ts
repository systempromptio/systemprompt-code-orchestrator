import { z } from 'zod';

export type ApiResponseStatus = 'success' | 'error' | 'partial';

export interface ApiResponse<T = unknown> {
  readonly status: ApiResponseStatus;
  readonly data?: T;
  readonly error?: ApiError;
  readonly metadata?: ResponseMetadata;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly path?: string;
  readonly timestamp: Date;
  readonly traceId?: string;
}

export interface ResponseMetadata {
  readonly requestId: string;
  readonly timestamp: Date;
  readonly duration: number;
  readonly version: string;
  readonly warnings?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  readonly pagination: PaginationInfo;
}

export interface PaginationInfo {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

export interface StreamingResponse<T = unknown> {
  readonly type: 'data' | 'error' | 'complete';
  readonly data?: T;
  readonly error?: ApiError;
  readonly sequence: number;
  readonly timestamp: Date;
}

export interface BatchResponse<T = unknown> {
  readonly results: BatchResult<T>[];
  readonly summary: BatchSummary;
}

export interface BatchResult<T = unknown> {
  readonly id: string;
  readonly status: 'success' | 'error' | 'skipped';
  readonly data?: T;
  readonly error?: ApiError;
}

export interface BatchSummary {
  readonly total: number;
  readonly successful: number;
  readonly failed: number;
  readonly skipped: number;
  readonly duration: number;
}

export interface ValidationErrorResponse extends ApiResponse<never> {
  readonly error: ValidationApiError;
}

export interface ValidationApiError extends ApiError {
  readonly code: 'VALIDATION_ERROR';
  readonly validationErrors: FieldError[];
}

export interface FieldError {
  readonly field: string;
  readonly message: string;
  readonly value?: unknown;
  readonly constraint?: string;
}

export const ApiResponseSchema = z.object({
  status: z.enum(['success', 'error', 'partial']),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    path: z.string().optional(),
    timestamp: z.date(),
    traceId: z.string().optional()
  }).optional(),
  metadata: z.object({
    requestId: z.string(),
    timestamp: z.date(),
    duration: z.number(),
    version: z.string(),
    warnings: z.array(z.string()).optional()
  }).optional()
});

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) => 
  ApiResponseSchema.extend({
    data: z.array(itemSchema).optional(),
    pagination: z.object({
      page: z.number().positive(),
      pageSize: z.number().positive(),
      totalItems: z.number().nonnegative(),
      totalPages: z.number().nonnegative(),
      hasNext: z.boolean(),
      hasPrevious: z.boolean()
    })
  });

export const StreamingResponseSchema = z.object({
  type: z.enum(['data', 'error', 'complete']),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    path: z.string().optional(),
    timestamp: z.date(),
    traceId: z.string().optional()
  }).optional(),
  sequence: z.number(),
  timestamp: z.date()
});

export function createSuccessResponse<T>(data: T, metadata?: Partial<ResponseMetadata>): ApiResponse<T> {
  return {
    status: 'success',
    data,
    metadata: metadata ? {
      requestId: metadata.requestId || generateRequestId(),
      timestamp: metadata.timestamp || new Date(),
      duration: metadata.duration || 0,
      version: metadata.version || '1.0.0',
      warnings: metadata.warnings
    } : undefined
  };
}

export function createErrorResponse(error: ApiError, metadata?: Partial<ResponseMetadata>): ApiResponse<never> {
  return {
    status: 'error',
    error,
    metadata: metadata ? {
      requestId: metadata.requestId || generateRequestId(),
      timestamp: metadata.timestamp || new Date(),
      duration: metadata.duration || 0,
      version: metadata.version || '1.0.0',
      warnings: metadata.warnings
    } : undefined
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationInfo,
  metadata?: Partial<ResponseMetadata>
): PaginatedResponse<T> {
  return {
    status: 'success',
    data,
    pagination,
    metadata: metadata ? {
      requestId: metadata.requestId || generateRequestId(),
      timestamp: metadata.timestamp || new Date(),
      duration: metadata.duration || 0,
      version: metadata.version || '1.0.0',
      warnings: metadata.warnings
    } : undefined
  };
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}