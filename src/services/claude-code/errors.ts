/**
 * @file Error definitions for Claude Code service
 * @module services/claude-code/errors
 */

export class ClaudeCodeError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'ClaudeCodeError';
  }
}

export class SessionNotFoundError extends ClaudeCodeError {
  constructor(sessionId: string) {
    super(`Session ${sessionId} not found`, 'SESSION_NOT_FOUND');
  }
}

export class SessionNotReadyError extends ClaudeCodeError {
  constructor(sessionId: string, status: string) {
    super(`Session ${sessionId} is ${status}`, 'SESSION_NOT_READY');
  }
}

export class HostProxyError extends ClaudeCodeError {
  constructor(message: string) {
    super(message, 'HOST_PROXY_ERROR');
  }
}

export class HostProxyConnectionError extends HostProxyError {
  constructor(message: string) {
    super(`Host proxy connection failed: ${message}`);
  }
}

export class HostProxyTimeoutError extends HostProxyError {
  constructor(timeout: number) {
    super(`Host proxy timeout after ${timeout}ms`);
  }
}

export class QueryTimeoutError extends ClaudeCodeError {
  constructor(timeout: number) {
    super(`Query timeout after ${timeout}ms`, 'QUERY_TIMEOUT');
  }
}

export class CreditBalanceError extends ClaudeCodeError {
  constructor() {
    super('Credit balance is too low. Please check your Anthropic account.', 'CREDIT_BALANCE_LOW');
  }
}

export class InvalidApiKeyError extends ClaudeCodeError {
  constructor() {
    super('Invalid API key. Please check your ANTHROPIC_API_KEY.', 'INVALID_API_KEY');
  }
}

export class QueryAbortedError extends ClaudeCodeError {
  constructor(reason: string) {
    super(`Query aborted: ${reason}`, 'QUERY_ABORTED');
  }
}