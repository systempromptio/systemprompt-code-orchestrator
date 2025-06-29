/**
 * @file Query execution for Claude Code service
 * @module services/claude-code/query-executor
 */

import { query, type SDKMessage, type SDKAssistantMessage, type Options } from '@anthropic-ai/claude-code';
import type { ClaudeCodeSession, ClaudeCodeOptions, QueryResult } from './types.js';
import { 
  QueryTimeoutError, 
  QueryAbortedError,
  CreditBalanceError,
  InvalidApiKeyError 
} from './errors.js';
import { 
  DEFAULT_TIMEOUT_MS, 
  DOCKER_WORKSPACE_PATH,
  ERROR_PATTERNS 
} from './constants.js';
import { logger } from '../../utils/logger.js';

export class QueryExecutor {
  /**
   * Executes a query using the Claude Code SDK
   */
  async execute(
    session: ClaudeCodeSession,
    prompt: string,
    options?: Partial<ClaudeCodeOptions>
  ): Promise<QueryResult> {
    const timeoutMs = options?.timeout || DEFAULT_TIMEOUT_MS;
    const messages: SDKMessage[] = [];
    let timeoutId: NodeJS.Timeout | null = null;

    const abortController = new AbortController();
    session.abortController = abortController;

    try {
      const queryOptions = this.buildQueryOptions(session, options);
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          abortController.abort();
          reject(new QueryTimeoutError(timeoutMs));
        }, timeoutMs);
      });

      // Execute query
      const queryPromise = this.executeQuery(
        prompt,
        abortController,
        queryOptions,
        messages,
        session
      );

      // Race between query and timeout
      await Promise.race([queryPromise, timeoutPromise]);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return {
        content: this.extractContent(messages),
        messages
      };
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Handle specific errors
      const processedError = this.processError(error, messages);
      throw processedError;
    } finally {
      session.abortController = undefined;
    }
  }

  /**
   * Builds query options from session and override options
   */
  private buildQueryOptions(
    session: ClaudeCodeSession, 
    overrides?: Partial<ClaudeCodeOptions>
  ): Options {
    const options: Options = {};

    // Set working directory
    options.cwd = DOCKER_WORKSPACE_PATH;

    // Apply session options
    if (session.options.maxTurns) options.maxTurns = session.options.maxTurns;
    if (session.options.model) options.model = session.options.model;
    if (session.options.allowedTools) options.allowedTools = session.options.allowedTools;
    if (session.options.customSystemPrompt) options.customSystemPrompt = session.options.customSystemPrompt;

    // Apply overrides
    if (overrides?.maxTurns) options.maxTurns = overrides.maxTurns;
    if (overrides?.model) options.model = overrides.model;
    if (overrides?.allowedTools) options.allowedTools = overrides.allowedTools;
    if (overrides?.customSystemPrompt) options.customSystemPrompt = overrides.customSystemPrompt;

    return options;
  }

  /**
   * Executes the actual query
   */
  private async executeQuery(
    prompt: string,
    abortController: AbortController,
    options: Options,
    messages: SDKMessage[],
    session: ClaudeCodeSession
  ): Promise<void> {
    try {
      for await (const message of query({ prompt, abortController, options })) {
        messages.push(message);
        session.outputBuffer.push(message);
        session.lastActivity = new Date();
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new QueryAbortedError(error instanceof Error ? error.message : 'Unknown error');
      }
      throw error;
    }
  }

  /**
   * Extracts content from messages
   */
  private extractContent(messages: SDKMessage[]): string {
    return messages
      .filter((m): m is SDKAssistantMessage => m.type === 'assistant')
      .map(m => {
        if (m.message?.content && Array.isArray(m.message.content)) {
          return m.message.content
            .filter((c: any): c is { type: 'text'; text: string } => c.type === 'text')
            .map((c: any) => c.text)
            .join('');
        }
        return '';
      })
      .join('\n');
  }

  /**
   * Processes errors and extracts meaningful messages
   */
  private processError(error: unknown, messages: SDKMessage[]): Error {
    logger.error('Query execution failed', { error });

    // Check for specific error patterns in messages
    const lastAssistantMessage = messages
      .filter((m): m is SDKAssistantMessage => m.type === 'assistant')
      .pop();

    if (lastAssistantMessage?.message?.content) {
      const content = lastAssistantMessage.message.content;
      if (Array.isArray(content)) {
        const textContent = content
          .filter((c: any): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c: any) => c.text)
          .join(' ');

        if (textContent.includes(ERROR_PATTERNS.CREDIT_BALANCE)) {
          return new CreditBalanceError();
        }
        if (textContent.includes(ERROR_PATTERNS.INVALID_API_KEY)) {
          return new InvalidApiKeyError();
        }
      }
    }

    return error instanceof Error ? error : new Error(String(error));
  }
}