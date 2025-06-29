/**
 * @file Progress tracking for Claude Code service
 * @module services/claude-code/progress-tracker
 */

import type { ClaudeCodeSession, ProgressEvent } from './types.js';
import { logger } from '../../utils/logger.js';
import type { TaskStore } from '../task-store.js';

export class ProgressTracker {
  constructor(private readonly taskStore: TaskStore) {}

  /**
   * Parses and logs progress from stream data
   */
  async parseProgressFromStream(session: ClaudeCodeSession, data: string): Promise<ProgressEvent | void> {
    if (!session.taskId || !data.trim()) return;

    try {
      // Log the raw data to task
      await this.taskStore.addLog(session.taskId, data.trim());
      
      // Emit progress event
      return {
        taskId: session.taskId,
        event: 'stream:data',
        data: data.trim()
      } as ProgressEvent;
    } catch (error) {
      logger.error('Error parsing progress', { 
        sessionId: session.id,
        taskId: session.taskId,
        error 
      });
    }
  }

  /**
   * Logs assistant message to task
   */
  async logAssistantMessage(taskId: string, content: any[]): Promise<void> {
    if (!Array.isArray(content)) return;

    for (const item of content) {
      if (item.type === 'text' && item.text) {
        await this.taskStore.addLog(taskId, `[ASSISTANT_MESSAGE] ${item.text}`);
      } else if (item.type === 'tool_use') {
        await this.taskStore.addLog(
          taskId, 
          `[TOOL_USE] ${item.name || 'unknown'}: ${JSON.stringify(item.input || {})}`
        );
      }
    }
  }

  /**
   * Creates a progress event
   */
  createProgressEvent(taskId: string, event: string, data: string): ProgressEvent {
    return {
      taskId,
      event,
      data
    };
  }
}