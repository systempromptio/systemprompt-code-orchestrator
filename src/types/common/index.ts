/**
 * Common base types used across the application
 */

/**
 * Base error interface that all error types should extend
 */
export interface BaseError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly timestamp?: Date;
}

/**
 * Common user identity information
 */
export interface UserIdentity {
  readonly id: string;
  readonly email?: string;
  readonly roles?: string[];
  readonly permissions?: string[];
}

/**
 * Base metadata interface
 */
export interface BaseMetadata {
  readonly timestamp: Date;
  readonly [key: string]: unknown;
}

/**
 * Common status values for stateful entities
 */
export type EntityStatus = 'idle' | 'initializing' | 'ready' | 'busy' | 'error' | 'terminated';

/**
 * Common tool call structure
 */
export interface BaseToolCall {
  readonly name: string;
  readonly arguments?: unknown;
}

/**
 * Common tool result structure
 */
export interface BaseToolResult {
  readonly output?: unknown;
  readonly error?: BaseError;
}