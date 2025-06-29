/**
 * @file End task orchestrator tool
 * @module handlers/tools/orchestrator/end-task
 */

import type { ToolHandler, CallToolResult, ToolHandlerContext } from '../types.js';
import { formatToolResponse } from '../types.js';
import { logger } from '../../../utils/logger.js';
import {
  EndTaskArgsSchema,
  type EndTaskArgs,
  TaskNotFoundError
} from './utils/index.js';
import {
  validateInput,
  taskOperations,
  agentOperations
} from './utils/index.js';

/**
 * Result of ending a task
 */
interface EndTaskResult {
  task_id: string;
  description: string;
  status: string;
  duration_ms: number;
  logs: string[];
  session_closed: boolean;
}

/**
 * Ends a task by updating its status and closing the associated process
 * 
 * @param args - Task termination parameters
 * @param context - Execution context containing session information
 * @returns Task execution logs and status
 * 
 * @example
 * ```typescript
 * await handleEndTask({
 *   task_id: "task_abc123",
 *   status: "completed"
 * }, { sessionId: "session_123" });
 * ```
 */
export const handleEndTask: ToolHandler<EndTaskArgs> = async (
  args: unknown,
  context?: ToolHandlerContext
): Promise<CallToolResult> => {
  try {
    // Validate input
    const validated = validateInput(EndTaskArgsSchema, args);
    
    logger.info('Ending task', {
      taskId: validated.task_id,
      status: validated.status,
      sessionId: context?.sessionId
    });
    
    // Get the task
    const task = await taskOperations.taskStore.getTask(validated.task_id);
    if (!task) {
      throw new TaskNotFoundError(validated.task_id);
    }
    
    // Calculate duration
    const startTime = task.started_at ? new Date(task.started_at).getTime() : new Date(task.created_at).getTime();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Update task status
    const completedAt = new Date().toISOString();
    await taskOperations.updateTaskStatus(
      task.id,
      validated.status,
      context?.sessionId,
      {
        completedAt
      }
    );
    
    // Close the associated process if exists
    let sessionClosed = false;
    if (task.assigned_to) {
      try {
        await agentOperations.endAgentSession(task.assigned_to, `Task ${validated.status}`);
        sessionClosed = true;
        await taskOperations.addTaskLog(
          task.id,
          `[SESSION_CLOSED] Agent session terminated`,
          context?.sessionId
        );
      } catch (error) {
        logger.warn('Failed to close agent session', { 
          sessionId: task.assigned_to,
          error 
        });
        await taskOperations.addTaskLog(
          task.id,
          `[SESSION_CLOSE_FAILED] Could not terminate agent session`,
          context?.sessionId
        );
      }
    }
    
    // Create result
    const result: EndTaskResult = {
      task_id: task.id,
      description: task.description,
      status: validated.status,
      duration_ms: duration,
      logs: task.logs || [],
      session_closed: sessionClosed
    };
    
    logger.info('Task ended successfully', {
      taskId: task.id,
      status: validated.status,
      duration,
      sessionClosed
    });
    
    return formatToolResponse({
      message: `Task ${task.id} ended with status: ${validated.status}`,
      result
    });
    
  } catch (error) {
    logger.error('Failed to end task', { error, args });
    
    if (error instanceof TaskNotFoundError) {
      return formatToolResponse({
        status: 'error',
        message: error.message,
        error: {
          type: 'task_not_found',
          details: { taskId: error.message.split(': ')[1] }
        }
      });
    }
    
    return formatToolResponse({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to end task',
      error: {
        type: 'task_end_error',
        details: error instanceof Error ? error.stack : undefined
      }
    });
  }
};