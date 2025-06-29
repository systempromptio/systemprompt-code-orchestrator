/**
 * @file Update task orchestrator tool
 * @module handlers/tools/orchestrator/update-task
 */

import type { ToolHandler, CallToolResult, ToolHandlerContext } from '../types.js';
import { formatToolResponse } from '../types.js';
import { logger } from '../../../utils/logger.js';
import {
  UpdateTaskArgsSchema,
  type UpdateTaskArgs
} from './utils/index.js';
import {
  validateInput,
  taskOperations,
  agentOperations
} from './utils/index.js';

/**
 * Sends new instructions to an active AI agent session
 * 
 * @param args - Process ID and instructions to send
 * @param context - Execution context containing session information
 * @returns Result of the command execution
 * 
 * @example
 * ```typescript
 * await handleUpdateTask({
 *   process: "session_abc123",
 *   instructions: "Add error handling to the authentication module"
 * }, { sessionId: "session_123" });
 * ```
 */
export const handleUpdateTask: ToolHandler<UpdateTaskArgs> = async (
  args: unknown,
  context?: ToolHandlerContext
): Promise<CallToolResult> => {
  const startTime = Date.now();
  
  try {
    // Validate input
    const validated = validateInput(UpdateTaskArgsSchema, args);
    
    logger.info('Updating task with new instructions', {
      process: validated.process,
      instructionsLength: validated.instructions.length,
      sessionId: context?.sessionId
    });
    
    // Get session information
    const session = agentOperations.agentManager.getSession(validated.process);
    if (!session) {
      logger.warn('Process not found', { process: validated.process });
      
      return formatToolResponse({
        status: 'error',
        message: `Process ${validated.process} not found`,
        error: { 
          type: 'process_not_found',
          details: {
            process: validated.process,
            suggestion: 'Use check_status to list active sessions'
          }
        }
      });
    }
    
    // Validate session state
    const sessionValidation = validateSessionState(session);
    if (!sessionValidation.valid) {
      return formatToolResponse({
        status: 'error',
        message: sessionValidation.message,
        error: {
          type: 'invalid_session_state',
          details: {
            process: validated.process,
            currentStatus: session.status,
            expectedStatus: 'active or busy'
          }
        }
      });
    }
    
    // Find associated task if any
    let taskId: string | undefined;
    if (session.taskId) {
      taskId = session.taskId;
      
      // Log the new instructions to the task
      await taskOperations.taskStore.addLog(
        taskId,
        `[UPDATE_INSTRUCTIONS] Sending new instructions: ${validated.instructions.substring(0, 100)}...`,
        context?.sessionId
      );
    }
    
    // Execute the instructions
    const result = await agentOperations.executeInstructions(
      validated.process,
      validated.instructions,
      {
        taskId,
        updateProgress: true,
        timeout: 300000 // 5 minutes default timeout
      }
    );
    
    const executionTime = Date.now() - startTime;
    
    // Log result to task if applicable
    if (taskId) {
      const logMessage = result.success
        ? `[UPDATE_SUCCESS] Instructions executed in ${Math.floor(executionTime / 1000)}s`
        : `[UPDATE_FAILED] Instructions failed: ${result.error}`;
        
      await taskOperations.taskStore.addLog(
        taskId,
        logMessage,
        context?.sessionId
      );
      
      // Log output if present
      if (result.output) {
        await taskOperations.taskStore.addLog(
          taskId,
          `[UPDATE_OUTPUT]\n${result.output}`,
          context?.sessionId
        );
      }
    }
    
    logger.info('Task update completed', {
      process: validated.process,
      taskId,
      success: result.success,
      executionTimeMs: executionTime
    });
    
    // Return appropriate response based on result
    if (result.success) {
      return formatToolResponse({
        message: 'Instructions sent successfully',
        result: {
          process: validated.process,
          task_id: taskId,
          instructions_sent: validated.instructions,
          execution_time_ms: executionTime,
          session_status: session.status,
          output: result.output
        }
      });
    } else {
      return formatToolResponse({
        status: 'error',
        message: `Failed to execute instructions: ${result.error}`,
        error: {
          type: 'command_failed',
          details: {
            process: validated.process,
            error: result.error,
            execution_time_ms: executionTime
          }
        }
      });
    }
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Failed to update task', { error, args });
    
    return formatToolResponse({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update task',
      error: {
        type: 'task_update_error',
        details: {
          error: error instanceof Error ? error.stack : undefined,
          execution_time_ms: executionTime
        }
      }
    });
  }
};

/**
 * Validates that a session is in a valid state for receiving updates
 */
function validateSessionState(session: any): { valid: boolean; message: string } {
  // Check if session is terminated
  if (session.status === 'terminated') {
    return {
      valid: false,
      message: `Process ${session.id} has been terminated`
    };
  }
  
  // Check if session is in error state
  if (session.status === 'error') {
    return {
      valid: false,
      message: `Process ${session.id} is in error state and cannot receive commands`
    };
  }
  
  // Check if session is starting
  if (session.status === 'starting') {
    return {
      valid: false,
      message: `Process ${session.id} is still starting up. Please wait a moment and try again.`
    };
  }
  
  // Active and busy states are valid for receiving commands
  if (session.status === 'active' || session.status === 'busy') {
    return {
      valid: true,
      message: 'Session is ready'
    };
  }
  
  // Unknown state
  return {
    valid: false,
    message: `Process ${session.id} is in unknown state: ${session.status}`
  };
}