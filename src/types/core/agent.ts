import { EventEmitter } from 'events';
import { z } from 'zod';

export type AgentProvider = 'claude' | 'gemini' | 'custom';

export type AgentStatus = 'idle' | 'initializing' | 'ready' | 'processing' | 'error' | 'terminated';

export type AgentId = string & { readonly __brand: 'AgentId' };

export const createAgentId = (id: string): AgentId => id as AgentId;

export interface AgentCapabilities {
  readonly supportsStreaming: boolean;
  readonly supportsTools: boolean;
  readonly supportsMultimodal: boolean;
  readonly maxContextLength: number;
  readonly supportedFileTypes: readonly string[];
}

export interface AgentMetadata {
  readonly provider: AgentProvider;
  readonly model?: string;
  readonly version?: string;
  readonly capabilities: AgentCapabilities;
}

export interface AgentInitOptions<TConfig = unknown> {
  readonly id?: AgentId;
  readonly workingDirectory?: string;
  readonly environment?: Record<string, string>;
  readonly config: TConfig;
  readonly metadata?: Record<string, unknown>;
}

export interface QueryContext {
  readonly sessionId: string;
  readonly parentTaskId?: string;
  readonly toolsEnabled?: boolean;
  readonly streamResponse?: boolean;
  readonly timeout?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface QueryResult<TResponse = unknown> {
  readonly success: boolean;
  readonly response?: TResponse;
  readonly error?: AgentError;
  readonly duration: number;
  readonly tokensUsed?: TokenUsage;
}

export interface TokenUsage {
  readonly input: number;
  readonly output: number;
  readonly total: number;
}

export interface AgentError {
  readonly code: AgentErrorCode;
  readonly message: string;
  readonly details?: unknown;
  readonly retryable: boolean;
}

export enum AgentErrorCode {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  QUERY_FAILED = 'QUERY_FAILED',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  UNKNOWN = 'UNKNOWN'
}

export interface IAgent<TConfig = unknown, TResponse = unknown> extends EventEmitter {
  readonly id: AgentId;
  readonly status: AgentStatus;
  readonly metadata: AgentMetadata;
  
  initialize(options: AgentInitOptions<TConfig>): Promise<void>;
  query(prompt: string, context?: QueryContext): Promise<QueryResult<TResponse>>;
  terminate(): Promise<void>;
  
  getStatus(): AgentStatus;
  getMetadata(): AgentMetadata;
  isReady(): boolean;
}

export const AgentStatusSchema = z.enum(['idle', 'initializing', 'ready', 'processing', 'error', 'terminated']);

export const AgentProviderSchema = z.enum(['claude', 'gemini', 'custom']);

export const AgentCapabilitiesSchema = z.object({
  supportsStreaming: z.boolean(),
  supportsTools: z.boolean(),
  supportsMultimodal: z.boolean(),
  maxContextLength: z.number().positive(),
  supportedFileTypes: z.array(z.string()).readonly()
});

export const QueryContextSchema = z.object({
  sessionId: z.string(),
  parentTaskId: z.string().optional(),
  toolsEnabled: z.boolean().optional(),
  streamResponse: z.boolean().optional(),
  timeout: z.number().positive().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type AgentInstanceEventMap = {
  'status:changed': (status: AgentStatus) => void;
  'query:start': (context: QueryContext) => void;
  'query:complete': (result: QueryResult) => void;
  'error': (error: AgentError) => void;
  'initialized': () => void;
  'terminated': () => void;
};