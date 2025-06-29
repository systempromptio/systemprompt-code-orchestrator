/**
 * @file Error definitions for Agent Manager service
 * @module services/agent-manager/errors
 */

export class AgentManagerError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'AgentManagerError';
  }
}

export class SessionNotFoundError extends AgentManagerError {
  constructor(sessionId: string) {
    super(`Session ${sessionId} not found`, 'SESSION_NOT_FOUND');
  }
}

export class SessionNotActiveError extends AgentManagerError {
  constructor(sessionId: string, status: string) {
    super(`Session ${sessionId} is ${status}`, 'SESSION_NOT_ACTIVE');
  }
}

export class UnknownSessionTypeError extends AgentManagerError {
  constructor(type: string) {
    super(`Unknown session type: ${type}`, 'UNKNOWN_SESSION_TYPE');
  }
}

export class CommandExecutionError extends AgentManagerError {
  constructor(message: string, public readonly retryable: boolean = false) {
    super(message, 'COMMAND_FAILED');
  }
}