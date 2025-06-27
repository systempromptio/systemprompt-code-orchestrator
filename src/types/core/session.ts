import { z } from 'zod';
import { AgentId, AgentProvider } from './agent';

export type SessionId = string & { readonly __brand: 'SessionId' };
export const createSessionId = (id: string): SessionId => id as SessionId;

export type SessionStatus = 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface SessionConfig {
  readonly maxDuration?: number;
  readonly maxTurns?: number;
  readonly autoSave?: boolean;
  readonly persistState?: boolean;
}

export interface SessionContext {
  readonly workingDirectory: string;
  readonly environment: Record<string, string>;
  readonly variables: Record<string, unknown>;
}

export interface Session {
  readonly id: SessionId;
  readonly agentId: AgentId;
  readonly provider: AgentProvider;
  readonly status: SessionStatus;
  readonly config: SessionConfig;
  readonly context: SessionContext;
  readonly startedAt: Date;
  readonly endedAt?: Date;
  readonly metadata: Record<string, unknown>;
}

export interface SessionState {
  readonly messages: SessionMessage[];
  readonly turns: number;
  readonly tokensUsed: number;
  readonly lastActivity: Date;
}

export interface SessionMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system' | 'tool';
  readonly content: string;
  readonly timestamp: Date;
  readonly metadata?: MessageMetadata;
}

export interface MessageMetadata {
  readonly toolCalls?: ToolCall[];
  readonly toolResults?: ToolResult[];
  readonly tokensUsed?: number;
  readonly model?: string;
}

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: unknown;
}

export interface ToolResult {
  readonly id: string;
  readonly toolCallId: string;
  readonly output: unknown;
  readonly error?: string;
}

export interface SessionManager {
  createSession(provider: AgentProvider, config?: SessionConfig): Promise<Session>;
  getSession(id: SessionId): Promise<Session | null>;
  updateSession(id: SessionId, updates: Partial<Session>): Promise<Session>;
  deleteSession(id: SessionId): Promise<void>;
  listSessions(filter?: SessionFilter): Promise<Session[]>;
}

export interface SessionFilter {
  readonly provider?: AgentProvider;
  readonly status?: SessionStatus;
  readonly startedAfter?: Date;
  readonly startedBefore?: Date;
}

export const SessionStatusSchema = z.enum(['active', 'paused', 'completed', 'failed', 'cancelled']);

export const SessionConfigSchema = z.object({
  maxDuration: z.number().positive().optional(),
  maxTurns: z.number().positive().optional(),
  autoSave: z.boolean().optional(),
  persistState: z.boolean().optional()
});

export const SessionMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  timestamp: z.date(),
  metadata: z.object({
    toolCalls: z.array(z.object({
      id: z.string(),
      name: z.string(),
      arguments: z.unknown()
    })).optional(),
    toolResults: z.array(z.object({
      id: z.string(),
      toolCallId: z.string(),
      output: z.unknown(),
      error: z.string().optional()
    })).optional(),
    tokensUsed: z.number().optional(),
    model: z.string().optional()
  }).optional()
});