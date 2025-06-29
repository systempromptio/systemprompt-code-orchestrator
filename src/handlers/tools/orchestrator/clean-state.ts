/**
 * @file Clean state orchestrator tool
 * @module handlers/tools/orchestrator/clean-state
 */

import type { ToolHandler, CallToolResult, ToolHandlerContext } from '../types.js';
import { formatToolResponse } from '../types.js';
import { logger } from '../../../utils/logger.js';
import {
  CleanStateArgsSchema,
  type CleanStateArgs
} from './utils/index.js';
import {
  validateInput,
  taskOperations
} from './utils/index.js';

/**
 * Cleans up system state by removing tasks
 * 
 * @param args - Optional task_id to delete specific task, or empty to delete all
 * @param context - Execution context containing session information
 * @returns Summary of deleted tasks
 * 
 * @example
 * ```typescript
 * // Delete specific task
 * await handleCleanState({ task_id: "task_123" });
 * 
 * // Delete all tasks
 * await handleCleanState({});
 * ```
 */
export const handleCleanState: ToolHandler<CleanStateArgs> = async (
  args: unknown,
  context?: ToolHandlerContext
): Promise<CallToolResult> => {
  const startTime = Date.now();
  
  try {
    // Validate input
    const validated = validateInput(CleanStateArgsSchema, args);
    
    logger.info('Starting cleanup operation', {
      taskId: validated.task_id,
      sessionId: context?.sessionId
    });
    
    if (validated.task_id) {
      // Delete specific task
      const task = await taskOperations.taskStore.getTask(validated.task_id);
      
      if (!task) {
        return formatToolResponse({
          status: 'error',
          message: `Task ${validated.task_id} not found`
        });
      }
      
      await taskOperations.taskStore.deleteTask(validated.task_id);
      
      logger.info('Deleted task', {
        taskId: validated.task_id,
        description: task.description
      });
      
      return formatToolResponse({
        message: `Deleted task: ${task.description} (${validated.task_id})`,
        result: {
          deleted_tasks: 1,
          task_ids: [validated.task_id]
        }
      });
      
    } else {
      // Delete all tasks
      const tasks = await taskOperations.taskStore.getAllTasks();
      const taskIds = tasks.map(t => t.id);
      
      for (const taskId of taskIds) {
        await taskOperations.taskStore.deleteTask(taskId);
      }
      
      logger.info('Deleted all tasks', {
        count: tasks.length
      });
      
      return formatToolResponse({
        message: `Deleted ${tasks.length} tasks`,
        result: {
          deleted_tasks: tasks.length,
          task_ids: taskIds
        }
      });
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Cleanup operation failed', { error, args });
    
    return formatToolResponse({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to clean state',
      error: {
        type: 'cleanup_error',
        details: {
          error: error instanceof Error ? error.stack : undefined,
          duration_ms: duration
        }
      }
    });
  }
};