import { z } from "zod";
import { formatToolResponse } from "../types.js";
import { logger } from "../../../utils/logger.js";
import { ToolHandler } from "../types.js";
import { TaskStore } from "../../../services/task-store.js";
import { ClaudeCodeService } from "../../../services/claude-code-service.js";

const CleanStateSchema = z.object({
  clean_tasks: z.boolean().default(true),
  clean_sessions: z.boolean().default(true),
  keep_recent: z.boolean().default(true),
  force: z.boolean().default(false),
  dry_run: z.boolean().default(false)
});

type CleanStateArgs = z.infer<typeof CleanStateSchema>;

interface CleanupStats {
  tasks: {
    total: number;
    removed: number;
    kept: number;
  };
  sessions: {
    total: number;
    terminated: number;
    kept: number;
  };
}

interface CleanupItem {
  type: 'task' | 'session';
  id: string;
  title?: string;
  status: string;
  branch?: string;
  updated_at?: string;
  workingDirectory?: string;
  lastActivity?: string;
}

/**
 * Cleans up system state by removing completed tasks and inactive sessions
 * @param args - Cleanup configuration parameters
 * @returns Summary of cleaned items and statistics
 */
export const handleCleanState: ToolHandler<CleanStateArgs> = async (args) => {
  logger.info('=== handleCleanState called ===', { args });
  
  try {
    const validated = CleanStateSchema.parse(args);
    
    const stats: CleanupStats = {
      tasks: {
        total: 0,
        removed: 0,
        kept: 0
      },
      sessions: {
        total: 0,
        terminated: 0,
        kept: 0
      }
    };
    
    const removedItems: CleanupItem[] = [];
    const keptItems: CleanupItem[] = [];
    
    if (validated.clean_tasks) {
      await cleanupTasks({
        validated,
        stats,
        removedItems,
        keptItems
      });
    }
    
    if (validated.clean_sessions) {
      await cleanupSessions({
        validated,
        stats,
        removedItems,
        keptItems
      });
    }
    
    const message = validated.dry_run 
      ? `Dry run completed. Would clean ${stats.tasks.removed} tasks and ${stats.sessions.terminated} sessions`
      : `Cleaned ${stats.tasks.removed} tasks and ${stats.sessions.terminated} sessions`;
    
    logger.info(message, stats);
    
    const result: any = {
      message,
      stats,
      dry_run: validated.dry_run
    };
    
    if (removedItems.length > 0) {
      result.removed = removedItems;
    }
    
    if (validated.dry_run && keptItems.length > 0) {
      result.kept = keptItems;
    }
    
    return formatToolResponse({
      status: 'success',
      message,
      result
    });
    
  } catch (error: unknown) {
    logger.error('=== handleCleanState error ===', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof z.ZodError) {
      return formatToolResponse({
        status: "error",
        message: "Invalid clean parameters",
        error: {
          type: "validation_error",
          details: error.errors
        }
      });
    }

    return formatToolResponse({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to clean state",
      error: {
        type: "clean_error"
      }
    });
  }
};

/**
 * Cleans up tasks based on status and age
 */
async function cleanupTasks(params: {
  validated: CleanStateArgs;
  stats: CleanupStats;
  removedItems: CleanupItem[];
  keptItems: CleanupItem[];
}): Promise<void> {
  const { validated, stats, removedItems, keptItems } = params;
  const taskStore = TaskStore.getInstance();
  const tasks = await taskStore.getTasks();
  stats.tasks.total = tasks.length;
  
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  for (const task of tasks) {
    const shouldRemove = validated.force || (
      ['completed', 'failed', 'cancelled'].includes(task.status) &&
      (!validated.keep_recent || new Date(task.updated_at) < oneDayAgo)
    );
    
    if (shouldRemove) {
      if (!validated.dry_run) {
        await taskStore.deleteTask(task.id);
      }
      stats.tasks.removed++;
      removedItems.push({
        type: 'task',
        id: task.id,
        title: task.title,
        status: task.status,
        branch: task.branch,
        updated_at: task.updated_at
      });
    } else {
      stats.tasks.kept++;
      keptItems.push({
        type: 'task',
        id: task.id,
        title: task.title,
        status: task.status,
        branch: task.branch
      });
    }
  }
}

/**
 * Cleans up Claude Code sessions based on status and activity
 */
async function cleanupSessions(params: {
  validated: CleanStateArgs;
  stats: CleanupStats;
  removedItems: CleanupItem[];
  keptItems: CleanupItem[];
}): Promise<void> {
  const { validated, stats, removedItems, keptItems } = params;
  const claudeService = ClaudeCodeService.getInstance();
  const claudeSessions = claudeService.getAllSessions();
  stats.sessions.total = claudeSessions.length;
  
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  for (const session of claudeSessions) {
    const shouldTerminate = validated.force || (
      ['error', 'terminated'].includes(session.status) ||
      (session.status === 'ready' && session.lastActivity < oneDayAgo)
    );
    
    if (shouldTerminate) {
      if (!validated.dry_run) {
        await claudeService.endSession(session.id);
      }
      stats.sessions.terminated++;
      removedItems.push({
        type: 'session',
        id: session.id,
        status: session.status,
        workingDirectory: session.workingDirectory,
        lastActivity: session.lastActivity instanceof Date ? session.lastActivity.toISOString() : session.lastActivity
      });
    } else {
      stats.sessions.kept++;
      keptItems.push({
        type: 'session',
        id: session.id,
        status: session.status
      });
    }
  }
}