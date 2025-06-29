/**
 * @file Type definitions for Claude Code service
 * @module services/claude-code/types
 */

import type { SDKMessage, Options } from '@anthropic-ai/claude-code';

export type SessionStatus = 'initializing' | 'ready' | 'busy' | 'error' | 'terminated';

export interface ClaudeCodeSession {
  readonly id: string;
  abortController?: AbortController;
  status: SessionStatus;
  readonly workingDirectory: string;
  readonly options: ClaudeCodeOptions;
  readonly outputBuffer: SDKMessage[];
  readonly errorBuffer: string[];
  readonly createdAt: Date;
  lastActivity: Date;
  taskId?: string;
  mcpSessionId?: string;
  readonly streamBuffer: string[];
}

export interface ClaudeCodeOptions extends Partial<Options> {
  workingDirectory?: string;
  timeout?: number;
  maxTurns?: number;
  model?: string;
  allowedTools?: string[];
  customSystemPrompt?: string;
}

export interface ClaudeCodeResponse {
  type: 'message' | 'tool_use' | 'error' | 'completion';
  content?: string;
  toolName?: string;
  toolInput?: unknown;
  error?: string;
}

export interface HostProxyMessage {
  tool: 'claude';
  command: string;
  workingDirectory: string;
}

export interface HostProxyResponse {
  type: 'stream' | 'error' | 'complete';
  data?: string;
}

export interface QueryResult {
  content: string;
  messages: SDKMessage[];
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  errorSessions: number;
  averageSessionDuration: number;
}

export interface ProgressEvent {
  taskId: string;
  event: string;
  data: string;
}

export interface StreamEvent {
  sessionId: string;
  data: string;
  taskId?: string;
}