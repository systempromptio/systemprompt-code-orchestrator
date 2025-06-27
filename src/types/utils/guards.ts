import { AgentStatus, AgentProvider } from '../core/agent';
import { SessionStatus } from '../core/session';
import { TaskStatus, TaskPriority, TaskType } from '../core/task';

export function isAgentStatus(value: unknown): value is AgentStatus {
  return typeof value === 'string' && 
    ['idle', 'initializing', 'ready', 'processing', 'error', 'terminated'].includes(value);
}

export function isAgentProvider(value: unknown): value is AgentProvider {
  return typeof value === 'string' && 
    ['claude', 'gemini', 'custom'].includes(value);
}

export function isSessionStatus(value: unknown): value is SessionStatus {
  return typeof value === 'string' && 
    ['active', 'paused', 'completed', 'failed', 'cancelled'].includes(value);
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && 
    ['pending', 'in_progress', 'completed', 'failed', 'cancelled'].includes(value);
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && 
    ['low', 'medium', 'high', 'critical'].includes(value);
}

export function isTaskType(value: unknown): value is TaskType {
  return typeof value === 'string' && 
    ['query', 'code_generation', 'code_review', 'refactoring', 'testing', 'documentation', 'custom'].includes(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0;
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj;
}

export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined');
  }
}

export function assertString(
  value: unknown,
  message?: string
): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(message || 'Value is not a string');
  }
}

export function assertNumber(
  value: unknown,
  message?: string
): asserts value is number {
  if (typeof value !== 'number') {
    throw new Error(message || 'Value is not a number');
  }
}

export function assertBoolean(
  value: unknown,
  message?: string
): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new Error(message || 'Value is not a boolean');
  }
}

export function assertArray<T>(
  value: unknown,
  itemGuard?: (item: unknown) => item is T,
  message?: string
): asserts value is T[] {
  if (!Array.isArray(value)) {
    throw new Error(message || 'Value is not an array');
  }
  
  if (itemGuard) {
    for (let i = 0; i < value.length; i++) {
      if (!itemGuard(value[i])) {
        throw new Error(`Array item at index ${i} failed type guard`);
      }
    }
  }
}

export function assertObject(
  value: unknown,
  message?: string
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(message || 'Value is not an object');
  }
}