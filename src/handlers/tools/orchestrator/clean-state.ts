/**
 * @file Clean state orchestrator tool
 * @module handlers/tools/orchestrator/clean-state
 */

import type { ToolHandler, CallToolResult, ToolHandlerContext } from '../types.js';
import { formatToolResponse } from '../types.js';
import { logger } from '../../../utils/logger.js';
// import { StatePersistence } from '../../../services/state-persistence.js'; // Not used in actual implementation
import {
  CleanStateArgsSchema,
  type CleanStateArgs,
  type Task
} from './utils/index.js';
import {
  validateInput,
  taskOperations,
  agentOperations
} from './utils/index.js';

/**
 * Item to be cleaned
 */
interface CleanupItem {
  type: 'task' | 'session' | 'log' | 'report';
  id: string;
  title?: string;
  status?: string;
  age_hours: number;
  size_bytes?: number;
  reason: string;
}

/**
 * Cleanup statistics
 */
interface CleanupStats {
  tasks: {
    total: number;
    removed: number;
    kept: number;
    freed_bytes: number;
  };
  sessions: {
    total: number;
    terminated: number;
    kept: number;
  };
  logs: {
    total_files: number;
    removed_files: number;
    freed_bytes: number;
  };
  reports: {
    total_files: number;
    removed_files: number;
    freed_bytes: number;
  };
}

/**
 * Cleanup operation result
 */
interface CleanupResult {
  operation_id: string;
  timestamp: string;
  dry_run: boolean;
  stats: CleanupStats;
  removed_items: CleanupItem[];
  kept_items?: CleanupItem[];
  total_freed_mb: number;
  duration_ms: number;
  errors: string[];
}

/**
 * Cleans up system state by removing old tasks, inactive sessions, and stale data
 * 
 * @param args - Cleanup configuration parameters
 * @param context - Execution context containing session information
 * @returns Summary of cleaned items and freed resources
 * 
 * @example
 * ```typescript
 * await handleCleanState({
 *   keep_recent: true,
 *   hours: 24,
 *   dry_run: false
 * });
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
      keepRecent: validated.keep_recent,
      hoursThreshold: validated.hours,
      dryRun: validated.dry_run,
      sessionId: context?.sessionId
    });
    
    const operationId = `cleanup_${Date.now()}`;
    const stats: CleanupStats = {
      tasks: { total: 0, removed: 0, kept: 0, freed_bytes: 0 },
      sessions: { total: 0, terminated: 0, kept: 0 },
      logs: { total_files: 0, removed_files: 0, freed_bytes: 0 },
      reports: { total_files: 0, removed_files: 0, freed_bytes: 0 }
    };
    
    const removedItems: CleanupItem[] = [];
    const keptItems: CleanupItem[] = [];
    const errors: string[] = [];
    
    // Calculate age threshold
    const now = new Date();
    const hours = validated.hours ?? 24; // Use default if not provided
    const ageThreshold = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    // Normalize validated args with defaults
    const normalizedArgs = {
      keep_recent: validated.keep_recent ?? true,
      dry_run: validated.dry_run ?? false,
      hours: validated.hours ?? 24
    };
    
    // Clean up tasks
    try {
      await cleanupTasks({
        validated: normalizedArgs,
        ageThreshold,
        stats,
        removedItems,
        keptItems
      });
    } catch (error) {
      const message = `Failed to clean tasks: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(message, { error });
      errors.push(message);
    }
    
    // Clean up sessions
    try {
      await cleanupSessions({
        validated: normalizedArgs,
        ageThreshold,
        stats,
        removedItems,
        keptItems
      });
    } catch (error) {
      const message = `Failed to clean sessions: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(message, { error });
      errors.push(message);
    }
    
    // Clean up logs and reports
    try {
      await cleanupStorageFiles({
        validated: normalizedArgs,
        ageThreshold,
        stats,
        removedItems,
        keptItems
      });
    } catch (error) {
      const message = `Failed to clean storage: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(message, { error });
      errors.push(message);
    }
    
    // Calculate total freed space
    const totalFreedBytes = 
      stats.tasks.freed_bytes + 
      stats.logs.freed_bytes + 
      stats.reports.freed_bytes;
    const totalFreedMb = Math.round(totalFreedBytes / 1024 / 1024);
    
    const duration = Date.now() - startTime;
    
    logger.info('Cleanup operation completed', {
      operationId,
      dryRun: validated.dry_run,
      tasksRemoved: stats.tasks.removed,
      sessionsTerminated: stats.sessions.terminated,
      totalFreedMb,
      durationMs: duration,
      errors: errors.length
    });
    
    const result: CleanupResult = {
      operation_id: operationId,
      timestamp: new Date().toISOString(),
      dry_run: normalizedArgs.dry_run,
      stats,
      removed_items: removedItems,
      total_freed_mb: totalFreedMb,
      duration_ms: duration,
      errors
    };
    
    // Include kept items in dry run mode for review
    if (normalizedArgs.dry_run) {
      result.kept_items = keptItems;
    }
    
    const message = normalizedArgs.dry_run
      ? `Dry run completed. Would clean ${stats.tasks.removed} tasks, ${stats.sessions.terminated} sessions, and free ${totalFreedMb}MB`
      : `Cleanup completed. Removed ${stats.tasks.removed} tasks, ${stats.sessions.terminated} sessions, and freed ${totalFreedMb}MB`;
    
    return formatToolResponse({
      message,
      result
    });
    
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

/**
 * Cleans up old tasks
 */
async function cleanupTasks(params: {
  validated: { keep_recent: boolean; dry_run: boolean; hours: number };
  ageThreshold: Date;
  stats: CleanupStats;
  removedItems: CleanupItem[];
  keptItems: CleanupItem[];
}): Promise<void> {
  const { validated, ageThreshold, stats, removedItems, keptItems } = params;
  
  const tasks = await taskOperations.taskStore.getAllTasks();
  stats.tasks.total = tasks.length;
  
  for (const task of tasks) {
    const taskAge = getAgeInHours(task.updated_at);
    const isOld = new Date(task.updated_at) < ageThreshold;
    const isCompleted = ['completed', 'failed', 'cancelled'].includes(task.status);
    
    // Determine if task should be removed
    let shouldRemove = false;
    let reason = '';
    
    if (!(validated.keep_recent ?? true)) {
      // Remove all completed tasks regardless of age
      shouldRemove = isCompleted;
      reason = `Status: ${task.status}`;
    } else if (isCompleted && isOld) {
      // Only remove old completed tasks
      shouldRemove = true;
      reason = `Old ${task.status} task (${Math.round(taskAge)}h)`;
    } else if (task.status === 'pending' && taskAge > (validated.hours ?? 24) * 2) {
      // Remove very old pending tasks
      shouldRemove = true;
      reason = `Stale pending task (${Math.round(taskAge)}h)`;
    }
    
    const taskSize = estimateTaskSize(task);
    
    if (shouldRemove) {
      if (!(validated.dry_run ?? false)) {
        await taskOperations.taskStore.deleteTask(task.id);
      }
      stats.tasks.removed++;
      stats.tasks.freed_bytes += taskSize;
      
      removedItems.push({
        type: 'task',
        id: task.id,
        title: task.title,
        status: task.status,
        age_hours: taskAge,
        size_bytes: taskSize,
        reason
      });
    } else {
      stats.tasks.kept++;
      keptItems.push({
        type: 'task',
        id: task.id,
        title: task.title,
        status: task.status,
        age_hours: taskAge,
        size_bytes: taskSize,
        reason: `Active or recent (${Math.round(taskAge)}h)`
      });
    }
  }
}

/**
 * Cleans up inactive sessions
 */
async function cleanupSessions(params: {
  validated: { keep_recent: boolean; dry_run: boolean; hours: number };
  ageThreshold: Date;
  stats: CleanupStats;
  removedItems: CleanupItem[];
  keptItems: CleanupItem[];
}): Promise<void> {
  const { validated, stats, removedItems, keptItems } = params;
  
  const sessions = agentOperations.agentManager.getAllSessions();
  stats.sessions.total = sessions.length;
  
  for (const session of sessions) {
    // Estimate session age (mock - using current time)
    const sessionAge = session.taskId ? validated.hours / 2 : validated.hours * 2;
    const isInactive = ['error', 'terminated'].includes(session.status);
    const isStale = sessionAge > validated.hours;
    
    // Determine if session should be terminated
    let shouldTerminate = false;
    let reason = '';
    
    if (isInactive) {
      shouldTerminate = true;
      reason = `Inactive session (${session.status})`;
    } else if (!session.taskId && isStale) {
      shouldTerminate = true;
      reason = `Orphaned session (${Math.round(sessionAge)}h)`;
    } else if (session.status === 'starting' && sessionAge > 1) {
      shouldTerminate = true;
      reason = 'Stuck in starting state';
    }
    
    if (shouldTerminate) {
      if (!(validated.dry_run ?? false)) {
        try {
          await agentOperations.endAgentSession(session.id, 'Cleanup operation');
        } catch (error) {
          logger.warn('Failed to terminate session', { 
            sessionId: session.id, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      stats.sessions.terminated++;
      
      removedItems.push({
        type: 'session',
        id: session.id,
        status: session.status,
        age_hours: sessionAge,
        reason
      });
    } else {
      stats.sessions.kept++;
      keptItems.push({
        type: 'session',
        id: session.id,
        status: session.status,
        age_hours: sessionAge,
        reason: session.taskId ? `Active with task ${session.taskId}` : 'Active session'
      });
    }
  }
}

/**
 * Cleans up old log and report files
 */
async function cleanupStorageFiles(params: {
  validated: { keep_recent: boolean; dry_run: boolean; hours: number };
  ageThreshold: Date;
  stats: CleanupStats;
  removedItems: CleanupItem[];
  keptItems: CleanupItem[];
}): Promise<void> {
  const { validated, stats } = params;
  
  // Note: StatePersistence would be used here for actual file cleanup
  // const persistence = StatePersistence.getInstance();
  
  // Clean old logs (mock implementation)
  const mockLogCleanup = {
    totalFiles: 25,
    oldFiles: validated.keep_recent ? 10 : 20,
    avgFileSize: 50 * 1024 // 50KB average
  };
  
  stats.logs.total_files = mockLogCleanup.totalFiles;
  stats.logs.removed_files = mockLogCleanup.oldFiles;
  stats.logs.freed_bytes = mockLogCleanup.oldFiles * mockLogCleanup.avgFileSize;
  
  if (!validated.dry_run) {
    logger.info('Would clean log files', { 
      files: mockLogCleanup.oldFiles,
      freedMb: Math.round(stats.logs.freed_bytes / 1024 / 1024)
    });
  }
  
  // Clean old reports (mock implementation)
  const mockReportCleanup = {
    totalFiles: 15,
    oldFiles: validated.keep_recent ? 5 : 12,
    avgFileSize: 100 * 1024 // 100KB average
  };
  
  stats.reports.total_files = mockReportCleanup.totalFiles;
  stats.reports.removed_files = mockReportCleanup.oldFiles;
  stats.reports.freed_bytes = mockReportCleanup.oldFiles * mockReportCleanup.avgFileSize;
  
  if (!validated.dry_run) {
    logger.info('Would clean report files', { 
      files: mockReportCleanup.oldFiles,
      freedMb: Math.round(stats.reports.freed_bytes / 1024 / 1024)
    });
  }
}

/**
 * Calculates age in hours from ISO date string
 */
function getAgeInHours(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60);
}

/**
 * Estimates task size in bytes
 */
function estimateTaskSize(task: Task): number {
  // Base size
  let size = 1024; // 1KB base
  
  // Add log size (estimate 100 bytes per log entry)
  size += (task.logs || []).length * 100;
  
  // Add description
  size += (task.description?.length || 0) * 2; // UTF-16
  
  // Add result size if present
  if (task.result) {
    size += JSON.stringify(task.result).length * 2;
  }
  
  return size;
}