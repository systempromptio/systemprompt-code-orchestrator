import { z } from 'zod';
import type { Options } from '@anthropic-ai/claude-code';
import { ProviderMessage, ProviderResponse } from './base';

export interface ClaudeConfig extends Partial<Options> {
  readonly apiKey?: string;
  readonly model?: string;
  readonly maxTurns?: number;
  readonly temperature?: number;
  readonly systemPrompt?: string;
  readonly workingDirectory?: string;
  readonly allowedTools?: string[];
  readonly customTools?: Record<string, unknown>;
}

export interface ClaudeResponse extends ProviderResponse {
  readonly model: string;
  readonly stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
}

export interface ClaudeMessage extends ProviderMessage {
  readonly name?: string;
  readonly cacheControl?: {
    readonly type: 'ephemeral';
  };
}

export interface ClaudeToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: {
    readonly type: 'object';
    readonly properties: Record<string, unknown>;
    readonly required?: string[];
  };
}

export interface ClaudeStreamEvent {
  readonly type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop' | 'error';
  readonly message?: Partial<ClaudeResponse>;
  readonly delta?: {
    readonly type: 'text_delta' | 'input_json_delta';
    readonly text?: string;
    readonly partial_json?: string;
  };
  readonly content_block?: {
    readonly type: 'text' | 'tool_use';
    readonly id?: string;
    readonly name?: string;
    readonly input?: unknown;
  };
  readonly error?: {
    readonly type: string;
    readonly message: string;
  };
}

export const ClaudeConfigSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string().optional(),
  maxTurns: z.number().positive().optional(),
  temperature: z.number().min(0).max(1).optional(),
  systemPrompt: z.string().optional(),
  workingDirectory: z.string().optional(),
  allowedTools: z.array(z.string()).optional(),
  customTools: z.record(z.unknown()).optional(),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional()
});

export const ClaudeResponseSchema = z.object({
  content: z.string(),
  role: z.literal('assistant'),
  model: z.string(),
  stopReason: z.enum(['end_turn', 'max_tokens', 'stop_sequence', 'tool_use']).optional(),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number()
  }).optional(),
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string()
    })
  })).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const ClaudeToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.unknown()),
    required: z.array(z.string()).optional()
  })
});

// Message types from Claude SDK
export interface SDKMessage {
  type: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: 'text'; text: string }>;
  role?: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface SDKAssistantMessage extends SDKMessage {
  type: 'assistant';
  model?: string;
  stopReason?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export type ClaudeMessageAdapter = (message: SDKMessage) => ClaudeMessage;
export type ClaudeResponseAdapter = (message: SDKAssistantMessage) => ClaudeResponse;

export interface ClaudeCapabilities {
  readonly models: ClaudeModelInfo[];
  readonly maxContextTokens: number;
  readonly supportsVision: boolean;
  readonly supportsTools: boolean;
  readonly supportsCaching: boolean;
  readonly supportsStreaming: boolean;
}

export interface ClaudeModelInfo {
  readonly id: string;
  readonly name: string;
  readonly contextWindow: number;
  readonly maxOutputTokens: number;
  readonly trainingCutoff: Date;
  readonly supportsFunctionCalling: boolean;
  readonly supportsVision: boolean;
  readonly pricing: {
    readonly inputCostPer1kTokens: number;
    readonly outputCostPer1kTokens: number;
  };
}