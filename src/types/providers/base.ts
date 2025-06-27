import { z } from 'zod';
import { IAgent, AgentInitOptions } from '../core/agent';

export interface IAgentProvider<TConfig = unknown, TResponse = unknown> {
  readonly name: string;
  readonly version: string;
  
  createAgent(options: AgentInitOptions<TConfig>): Promise<IAgent<TConfig, TResponse>>;
  validateConfig(config: unknown): config is TConfig;
  getConfigSchema(): z.ZodSchema<TConfig>;
}

export interface ProviderResponse {
  readonly content: string;
  readonly role: 'assistant' | 'system';
  readonly toolCalls?: ProviderToolCall[];
  readonly metadata?: Record<string, unknown>;
}

export interface ProviderToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly arguments: string;
  };
}

export interface ProviderMessage {
  readonly role: 'user' | 'assistant' | 'system' | 'tool';
  readonly content: string;
  readonly toolCallId?: string;
  readonly toolCalls?: ProviderToolCall[];
}

export interface ProviderStreamingResponse {
  readonly delta: string;
  readonly finished: boolean;
  readonly toolCall?: Partial<ProviderToolCall>;
}

export interface ProviderCapabilities {
  readonly models: ModelInfo[];
  readonly features: FeatureInfo[];
  readonly limits: ProviderLimits;
}

export interface ModelInfo {
  readonly id: string;
  readonly name: string;
  readonly contextWindow: number;
  readonly trainingCutoff?: Date;
  readonly capabilities: string[];
}

export interface FeatureInfo {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly available: boolean;
}

export interface ProviderLimits {
  readonly maxTokensPerRequest: number;
  readonly maxRequestsPerMinute: number;
  readonly maxRequestsPerDay: number;
  readonly maxConcurrentRequests: number;
}

export abstract class BaseAgentProvider<TConfig = unknown, TResponse = unknown> 
  implements IAgentProvider<TConfig, TResponse> {
  
  abstract readonly name: string;
  abstract readonly version: string;
  
  abstract createAgent(options: AgentInitOptions<TConfig>): Promise<IAgent<TConfig, TResponse>>;
  abstract validateConfig(config: unknown): config is TConfig;
  abstract getConfigSchema(): z.ZodSchema<TConfig>;
  
  protected abstract getCapabilities(): ProviderCapabilities;
}

export const ProviderResponseSchema = z.object({
  content: z.string(),
  role: z.enum(['assistant', 'system']),
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

export const ProviderMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  toolCallId: z.string().optional(),
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string()
    })
  })).optional()
});