/**
 * @file End task orchestrator tool
 * @module handlers/tools/orchestrator/end-task
 */

import type { ToolHandler, CallToolResult, ToolHandlerContext } from '../types.js';
import { formatToolResponse } from '../types.js';
import { logger } from '../../../utils/logger.js';
import { StatePersistence } from '../../../services/state-persistence.js';
import { z } from 'zod';
import {
  EndTaskArgsSchema,
  type Task,
  TaskNotFoundError
} from './utils/index.js';
import {
  validateInput,
  taskOperations,
  agentOperations
} from './utils/index.js';

// Extended schema for additional options
const ExtendedEndTaskSchema = EndTaskArgsSchema.extend({
  final_command: z.string().optional(),
  summary: z.string().optional(),
  result: z.any().optional(),
  generate_report: z.boolean().default(true),
  cleanup: z.object({
    save_session_logs: z.boolean().default(true),
    save_code_changes: z.boolean().default(true),
    compress_context: z.boolean().default(false)
  }).optional()
});

type ExtendedEndTaskArgs = z.infer<typeof ExtendedEndTaskSchema>;

/**
 * Result of ending a task
 */
interface EndTaskResult {
  task_id: string;
  title: string;
  status: string;
  duration_ms: number;
  duration_human: string;
  total_logs: number;
  final_progress: number;
  summary: string;
  custom_result?: any;
  session_id: string | null;
  model_used: string;
  final_command_result?: any;
  report_path?: string | null;
}

/**
 * Ends a task, performs cleanup, and generates final reports
 * 
 * @param args - Task termination parameters
 * @param context - Execution context containing session information
 * @returns Summary of task completion with metrics and results
 * 
 * @example
 * ```typescript
 * await handleEndTask({
 *   task_id: "task_abc123",
 *   status: "completed",
 *   summary: "Successfully implemented authentication",
 *   generate_report: true
 * }, { sessionId: "session_123" });
 * ```
 */
export const handleEndTask: ToolHandler<ExtendedEndTaskArgs> = async (
  args: unknown,
  context?: ToolHandlerContext
): Promise<CallToolResult> => {
  try {
    // Validate input
    const validated = validateInput(ExtendedEndTaskSchema, args);
    
    logger.info('Ending task', {
      taskId: validated.task_id,
      status: validated.status,
      generateReport: validated.generate_report,
      sessionId: context?.sessionId
    });
    
    // Get the task
    const task = await taskOperations.taskStore.getTask(validated.task_id);
    if (!task) {
      throw new TaskNotFoundError(validated.task_id);
    }
    
    // Execute final command if provided
    let finalCommandResult = null;
    if (task.assigned_to && validated.final_command) {
      finalCommandResult = await executeFinalCommand({
        sessionId: task.assigned_to,
        taskId: task.id,
        command: validated.final_command,
        compressContext: validated.cleanup?.compress_context || false,
        context
      });
    }
    
    // Save session logs if requested
    if (task.assigned_to && validated.cleanup?.save_session_logs) {
      await saveSessionLogs({
        sessionId: task.assigned_to,
        taskId: task.id,
        context
      });
    }
    
    // Normalize validated args with defaults
    const normalizedArgs = {
      ...validated,
      generate_report: validated.generate_report ?? true,
      cleanup: validated.cleanup ? {
        save_session_logs: validated.cleanup.save_session_logs ?? true,
        save_code_changes: validated.cleanup.save_code_changes ?? true,
        compress_context: validated.cleanup.compress_context ?? false
      } : undefined
    };
    
    // Create final result before updating task
    const finalResult = createFinalResult(task, normalizedArgs);
    
    // Update task status
    const completedAt = new Date().toISOString();
    await taskOperations.updateTaskStatus(
      task.id,
      validated.status,
      context?.sessionId,
      {
        completedAt,
        result: {
          ...finalResult,
          customResult: validated.result
        }
      }
    );
    
    // Elapsed time is now calculated from timestamps, not stored
    
    // Generate final report if requested
    let reportPath = null;
    if (normalizedArgs.generate_report) {
      reportPath = await generateFinalReport({
        task,
        validated: normalizedArgs,
        finalResult,
        context
      });
    }
    
    // End agent session if exists
    if (task.assigned_to) {
      try {
        await agentOperations.endAgentSession(
          task.assigned_to,
          `Task ${validated.status}`
        );
        await taskOperations.taskStore.addLog(
          task.id,
          '[AGENT_TERMINATED] AI session ended',
          context?.sessionId
        );
      } catch (error) {
        logger.error('Failed to end agent session', {
          taskId: task.id,
          sessionId: task.assigned_to,
          error
        });
      }
    }
    
    logger.info('Task ended successfully', {
      taskId: task.id,
      finalStatus: validated.status,
      duration: finalResult.duration_human
    });
    
    // Return success response
    return formatToolResponse({
      message: `Task ${validated.status} successfully`,
      result: {
        ...finalResult,
        final_command_result: finalCommandResult,
        report_path: reportPath
      }
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

/**
 * Executes the final command before ending the task
 */
async function executeFinalCommand(params: {
  sessionId: string;
  taskId: string;
  command: string;
  compressContext: boolean;
  context?: ToolHandlerContext;
}): Promise<any> {
  const { sessionId, taskId, command, compressContext, context } = params;
  
  try {
    const session = agentOperations.agentManager.getSession(sessionId);
    if (!session || session.status === 'terminated') {
      logger.warn('Session not available for final command', { sessionId });
      return null;
    }
    
    // Send compress command for Gemini if requested
    if (session.type === 'gemini' && compressContext) {
      await agentOperations.agentManager.sendCommand(sessionId, {
        command: '/compress'
      });
      await taskOperations.taskStore.addLog(
        taskId,
        '[CONTEXT_COMPRESSED] Gemini context compressed',
        context?.sessionId
      );
    }
    
    // Execute the final command
    const result = await agentOperations.executeInstructions(
      sessionId,
      command,
      {
        taskId,
        updateProgress: false,
        timeout: 60000 // 1 minute timeout for final commands
      }
    );
    
    await taskOperations.taskStore.addLog(
      taskId,
      `[FINAL_COMMAND] Executed: ${command.substring(0, 100)}...`,
      context?.sessionId
    );
    
    return result;
  } catch (error) {
    logger.error('Failed to execute final command', { error, sessionId, command });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Saves session logs for archival
 */
async function saveSessionLogs(params: {
  sessionId: string;
  taskId: string;
  context?: ToolHandlerContext;
}): Promise<void> {
  const { sessionId, taskId, context } = params;
  
  try {
    const session = agentOperations.agentManager.getSession(sessionId);
    if (!session) {
      logger.warn('Session not found for log saving', { sessionId });
      return;
    }
    
    const persistence = StatePersistence.getInstance();
    const logs = session.output_buffer.join('\n');
    
    await persistence.saveSessionLog(sessionId, logs);
    
    await taskOperations.taskStore.addLog(
      taskId,
      `[LOGS_SAVED] Session logs saved: ${logs.length} bytes`,
      context?.sessionId
    );
  } catch (error) {
    logger.error('Failed to save session logs', { error, sessionId });
  }
}

/**
 * Creates the final result object with metrics
 */
function createFinalResult(
  task: Task,
  validated: ExtendedEndTaskArgs & { generate_report: boolean }
): EndTaskResult {
  const createdTime = new Date(task.created_at).getTime();
  const endTime = Date.now();
  const durationMs = endTime - createdTime;
  
  // Calculate final progress
  const finalProgress = validated.status === 'completed' ? 100 :
                       validated.status === 'cancelled' ? 50 :
                       75; // Failed
  
  return {
    task_id: task.id,
    title: task.title,
    status: validated.status,
    duration_ms: durationMs,
    duration_human: formatDuration(durationMs),
    total_logs: (task.logs || []).length,
    final_progress: finalProgress,
    summary: validated.summary || `Task ${validated.status}`,
    custom_result: validated.result,
    session_id: task.assigned_to || null,
    model_used: task.tool === 'CLAUDECODE' ? 'claude' : 'gemini'
  };
}

/**
 * Generates a comprehensive final report
 */
async function generateFinalReport(params: {
  task: Task;
  validated: ExtendedEndTaskArgs & { generate_report: boolean };
  finalResult: EndTaskResult;
  context?: ToolHandlerContext;
}): Promise<string | null> {
  const { task, validated, finalResult, context } = params;
  
  try {
    const persistence = StatePersistence.getInstance();
    
    const report = {
      task_summary: finalResult,
      task_details: {
        id: task.id,
        title: task.title,
        description: task.description,
        branch: task.branch,
        tool: task.tool
      },
      execution_metrics: {
        created_at: task.created_at,
        started_at: task.started_at,
        completed_at: task.completed_at,
        duration_ms: finalResult.duration_ms,
        status_transitions: (task.logs || []).filter(log => log.includes('[STATUS_CHANGE]'))
      },
      logs_summary: {
        total: (task.logs || []).length,
        errors: (task.logs || []).filter(log => log.includes('[ERROR]')).length,
        warnings: (task.logs || []).filter(log => log.includes('[WARNING]')).length,
        git_operations: (task.logs || []).filter(log => log.includes('[GIT')).length
      },
      code_changes: validated.cleanup?.save_code_changes
        ? await analyzeCodeChanges(task)
        : null,
      timestamp: new Date().toISOString()
    };
    
    const reportId = `${task.id}_final`;
    const reportPath = await persistence.saveReport(reportId, report);
    
    await taskOperations.taskStore.addLog(
      task.id,
      `[REPORT_GENERATED] Final report saved: ${reportPath}`,
      context?.sessionId
    );
    
    return reportPath;
  } catch (error) {
    logger.error('Failed to generate report', { error, taskId: task.id });
    return null;
  }
}

/**
 * Formats duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Analyzes code changes made during the task
 * TODO: Implement actual git diff analysis
 */
async function analyzeCodeChanges(task: Task): Promise<any> {
  try {
    // Get git operations from logs
    const gitLogs = (task.logs || []).filter(log => 
      log.includes('[GIT') || log.includes('git ')
    );
    
    return {
      branch: task.branch,
      git_operations: gitLogs.length,
      summary: 'Detailed code change analysis pending implementation',
      logs: gitLogs.slice(0, 10) // First 10 git-related logs
    };
  } catch (error) {
    logger.error('Failed to analyze code changes', { error, taskId: task.id });
    return {
      error: 'Failed to analyze code changes',
      summary: error instanceof Error ? error.message : String(error)
    };
  }
}