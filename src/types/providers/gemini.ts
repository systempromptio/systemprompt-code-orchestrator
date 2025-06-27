import { z } from 'zod';
import { ProviderMessage, ProviderResponse } from './base';

export interface GeminiConfig {
  readonly apiKey?: string;
  readonly model?: string;
  readonly temperature?: number;
  readonly topP?: number;
  readonly topK?: number;
  readonly maxOutputTokens?: number;
  readonly stopSequences?: string[];
  readonly safetySettings?: GeminiSafetySettings[];
  readonly systemInstruction?: string;
  readonly workingDirectory?: string;
  readonly tools?: GeminiTool[];
}

export interface GeminiResponse extends ProviderResponse {
  readonly model: string;
  readonly finishReason?: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER';
  readonly safetyRatings?: GeminiSafetyRating[];
  readonly citationMetadata?: GeminiCitation[];
  readonly tokenCount?: {
    readonly promptTokens: number;
    readonly candidatesTokens: number;
    readonly totalTokens: number;
  };
}

export interface GeminiMessage extends ProviderMessage {
  readonly parts: GeminiPart[];
}

export type GeminiPart = 
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

export interface GeminiTool {
  readonly functionDeclarations: GeminiFunctionDeclaration[];
}

export interface GeminiFunctionDeclaration {
  readonly name: string;
  readonly description: string;
  readonly parameters?: {
    readonly type: 'object';
    readonly properties: Record<string, GeminiParameterSchema>;
    readonly required?: string[];
  };
}

export interface GeminiParameterSchema {
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly description?: string;
  readonly enum?: string[];
  readonly items?: GeminiParameterSchema;
  readonly properties?: Record<string, GeminiParameterSchema>;
}

export interface GeminiSafetySettings {
  readonly category: 'HARM_CATEGORY_HARASSMENT' | 'HARM_CATEGORY_HATE_SPEECH' | 'HARM_CATEGORY_SEXUALLY_EXPLICIT' | 'HARM_CATEGORY_DANGEROUS_CONTENT';
  readonly threshold: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
}

export interface GeminiSafetyRating {
  readonly category: string;
  readonly probability: 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface GeminiCitation {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly uri: string;
  readonly title?: string;
  readonly license?: string;
  readonly publicationDate?: Date;
}

export interface GeminiStreamEvent {
  readonly candidates?: Array<{
    readonly content: {
      readonly parts: GeminiPart[];
      readonly role: string;
    };
    readonly finishReason?: string;
    readonly index: number;
    readonly safetyRatings?: GeminiSafetyRating[];
  }>;
  readonly promptFeedback?: {
    readonly safetyRatings?: GeminiSafetyRating[];
  };
}

export const GeminiConfigSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().positive().optional(),
  maxOutputTokens: z.number().positive().optional(),
  stopSequences: z.array(z.string()).optional(),
  safetySettings: z.array(z.object({
    category: z.enum(['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT']),
    threshold: z.enum(['BLOCK_NONE', 'BLOCK_ONLY_HIGH', 'BLOCK_MEDIUM_AND_ABOVE', 'BLOCK_LOW_AND_ABOVE'])
  })).optional(),
  systemInstruction: z.string().optional(),
  workingDirectory: z.string().optional(),
  tools: z.array(z.object({
    functionDeclarations: z.array(z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.object({
        type: z.literal('object'),
        properties: z.record(z.any()),
        required: z.array(z.string()).optional()
      }).optional()
    }))
  })).optional()
});

export const GeminiResponseSchema = z.object({
  content: z.string(),
  role: z.literal('assistant'),
  model: z.string(),
  finishReason: z.enum(['STOP', 'MAX_TOKENS', 'SAFETY', 'RECITATION', 'OTHER']).optional(),
  safetyRatings: z.array(z.object({
    category: z.string(),
    probability: z.enum(['NEGLIGIBLE', 'LOW', 'MEDIUM', 'HIGH'])
  })).optional(),
  citationMetadata: z.array(z.object({
    startIndex: z.number(),
    endIndex: z.number(),
    uri: z.string(),
    title: z.string().optional(),
    license: z.string().optional(),
    publicationDate: z.date().optional()
  })).optional(),
  tokenCount: z.object({
    promptTokens: z.number(),
    candidatesTokens: z.number(),
    totalTokens: z.number()
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

export interface GeminiCapabilities {
  readonly models: GeminiModelInfo[];
  readonly maxContextTokens: number;
  readonly supportsVision: boolean;
  readonly supportsTools: boolean;
  readonly supportsSystemInstructions: boolean;
  readonly supportsStreaming: boolean;
  readonly supportsSafetySettings: boolean;
}

export interface GeminiModelInfo {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly displayName: string;
  readonly description: string;
  readonly inputTokenLimit: number;
  readonly outputTokenLimit: number;
  readonly supportedGenerationMethods: string[];
  readonly temperature?: number;
  readonly topP?: number;
  readonly topK?: number;
}