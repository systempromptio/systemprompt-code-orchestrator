import { z } from "zod";
import type { ToolHandler } from "../types.js";
import { formatToolResponse } from "../types.js";
import { TaskStore } from "../../../services/task-store.js";
import { AgentManager } from "../../../services/agent-manager.js";

const UpdateStatsSchema = z.object({
  include_tasks: z.boolean().default(true),
  include_sessions: z.boolean().default(true)
});

type UpdateStatsArgs = z.infer<typeof UpdateStatsSchema>;

interface TaskStats {
  total: number;
  by_status: Record<string, number>;
  by_model: Record<string, number>;
}

interface SessionStats {
  total: number;
  active: number;
  by_type: Record<string, number>;
}

interface Stats {
  timestamp: string;
  tasks?: TaskStats;
  sessions?: SessionStats;
}

/**
 * Retrieves current statistics on tasks and active sessions
 * @param args - Statistics retrieval options
 * @returns Current system statistics including task and session counts
 */
export const handleUpdateStats: ToolHandler<UpdateStatsArgs> = async (args) => {
  try {
    const validated = UpdateStatsSchema.parse(args);
    const taskStore = TaskStore.getInstance();
    const agentManager = AgentManager.getInstance();
    
    const stats: Stats = {
      timestamp: new Date().toISOString()
    };
    
    if (validated.include_tasks) {
      stats.tasks = await getTaskStatistics(taskStore);
    }
    
    if (validated.include_sessions) {
      stats.sessions = getSessionStatistics(agentManager);
    }
    
    return formatToolResponse({
      message: "Stats retrieved successfully",
      result: stats
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return formatToolResponse({
        status: "error",
        message: "Invalid stats parameters",
        error: {
          type: "validation_error",
          details: error.errors
        }
      });
    }
    
    return formatToolResponse({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to get stats",
      error: { type: "stats_error" }
    });
  }
};

/**
 * Calculates task statistics from the task store
 */
async function getTaskStatistics(taskStore: TaskStore): Promise<TaskStats> {
  const tasks = await taskStore.getTasks();
  
  return {
    total: tasks.length,
    by_status: {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length
    },
    by_model: {
      claude: tasks.filter(t => t.preferred_agent === 'claude').length,
      gemini: tasks.filter(t => t.preferred_agent === 'gemini').length,
      auto: tasks.filter(t => t.preferred_agent === 'auto').length
    }
  };
}

/**
 * Calculates session statistics from the agent manager
 */
function getSessionStatistics(agentManager: AgentManager): SessionStats {
  const sessions = agentManager.getAllSessions();
  
  return {
    total: sessions.length,
    active: sessions.filter(s => s.status === 'active' || s.status === 'busy').length,
    by_type: {
      claude: sessions.filter(s => s.type === 'claude').length,
      gemini: sessions.filter(s => s.type === 'gemini').length
    }
  };
}