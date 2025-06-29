/**
 * @file Task logging utilities for Agent Manager
 * @module services/agent-manager/task-logger
 */

import type { TaskStore } from '../task-store.js';
import { LOG_PREFIXES, RESPONSE_PREVIEW_LENGTH } from './constants.js';
import { logger } from '../../utils/logger.js';

export class TaskLogger {
  constructor(private readonly taskStore: TaskStore) {}

  /**
   * Logs session creation
   */
  async logSessionCreated(
    taskId: string,
    sessionId: string,
    type: string,
    projectPath: string,
    initialContext?: string
  ): Promise<void> {
    try {
      await this.taskStore.addLog(
        taskId,
        `${LOG_PREFIXES.SESSION_CREATED} ${type} session created: ${sessionId}, working directory: ${projectPath}`
      );

      if (initialContext) {
        await this.taskStore.addLog(
          taskId,
          `${LOG_PREFIXES.SESSION_CONTEXT} Initial context provided: ${initialContext.substring(0, 200)}...`
        );
      }
    } catch (error) {
      logger.error('Failed to log session creation', { taskId, sessionId, error });
    }
  }

  /**
   * Logs command being sent
   */
  async logCommandSent(taskId: string, command: string): Promise<void> {
    try {
      await this.taskStore.addLog(taskId, `${LOG_PREFIXES.COMMAND_SENT} ${command}`);
    } catch (error) {
      logger.error('Failed to log command', { taskId, error });
    }
  }

  /**
   * Logs response received
   */
  async logResponseReceived(
    taskId: string,
    duration: number,
    outputLength: number,
    output: string
  ): Promise<void> {
    try {
      await this.taskStore.addLog(
        taskId,
        `${LOG_PREFIXES.RESPONSE_RECEIVED} Duration: ${duration}ms, Output length: ${outputLength} chars`
      );

      if (outputLength > 0) {
        const preview = output.substring(0, RESPONSE_PREVIEW_LENGTH);
        await this.taskStore.addLog(
          taskId,
          `${LOG_PREFIXES.RESPONSE_PREVIEW} ${preview}${outputLength > RESPONSE_PREVIEW_LENGTH ? '...' : ''}`
        );
      }
    } catch (error) {
      logger.error('Failed to log response', { taskId, error });
    }
  }

  /**
   * Logs Gemini response
   */
  async logGeminiResponse(
    taskId: string,
    duration: number,
    responseCount: number
  ): Promise<void> {
    try {
      await this.taskStore.addLog(
        taskId,
        `${LOG_PREFIXES.GEMINI_RESPONSE} Duration: ${duration}ms, Response count: ${responseCount}`
      );
    } catch (error) {
      logger.error('Failed to log Gemini response', { taskId, error });
    }
  }

  /**
   * Logs error
   */
  async logError(taskId: string, prefix: string, error: any): Promise<void> {
    try {
      const message = error instanceof Error ? error.message : String(error);
      await this.taskStore.addLog(taskId, `${prefix} ${message}`);
    } catch (logError) {
      logger.error('Failed to log error', { taskId, error: logError });
    }
  }

  /**
   * Logs session termination
   */
  async logSessionTermination(
    taskId: string,
    sessionId: string,
    type: string,
    success: boolean
  ): Promise<void> {
    try {
      if (success) {
        await this.taskStore.addLog(
          taskId,
          `${LOG_PREFIXES.SESSION_TERMINATED} ${type} session ended successfully: ${sessionId}`
        );
      } else {
        await this.taskStore.addLog(
          taskId,
          `${LOG_PREFIXES.SESSION_ERROR} Failed to end ${type} session: ${sessionId}`
        );
      }
    } catch (error) {
      logger.error('Failed to log session termination', { taskId, sessionId, error });
    }
  }
}