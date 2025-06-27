import { z } from 'zod';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      stack: this.stack
    };
  }
}

export class ValidationError extends AppError {
  public readonly errors: FieldValidationError[];

  constructor(errors: FieldValidationError[], message: string = 'Validation failed') {
    super(message, 'VALIDATION_ERROR', 400, { errors }, true);
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export interface FieldValidationError {
  readonly field: string;
  readonly message: string;
  readonly value?: unknown;
  readonly constraint?: string;
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: unknown) {
    super(message, 'AUTHENTICATION_ERROR', 401, details, true);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', details?: unknown) {
    super(message, 'AUTHORIZATION_ERROR', 403, details, true);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, identifier }, true);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', 409, details, true);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter }, true);
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly originalError?: unknown;

  constructor(service: string, message: string, originalError?: unknown) {
    super(
      `External service error (${service}): ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      { service, originalError },
      true
    );
    this.service = service;
    this.originalError = originalError;
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

export class TimeoutError extends AppError {
  public readonly timeout: number;

  constructor(operation: string, timeout: number) {
    super(
      `Operation '${operation}' timed out after ${timeout}ms`,
      'TIMEOUT',
      504,
      { operation, timeout },
      true
    );
    this.timeout = timeout;
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'An internal error occurred', details?: unknown) {
    super(message, 'INTERNAL_ERROR', 500, details, false);
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'AUTHENTICATION_ERROR',
  'AUTHORIZATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMIT_EXCEEDED',
  'EXTERNAL_SERVICE_ERROR',
  'TIMEOUT',
  'INTERNAL_ERROR',
  'UNKNOWN_ERROR'
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const AppErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  statusCode: z.number(),
  details: z.unknown().optional(),
  isOperational: z.boolean()
});

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message, { originalError: error });
  }

  return new InternalError('An unknown error occurred', { originalError: error });
}

export function createErrorFromZodError(zodError: z.ZodError): ValidationError {
  const errors: FieldValidationError[] = zodError.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    value: undefined,
    constraint: err.code
  }));

  return new ValidationError(errors);
}