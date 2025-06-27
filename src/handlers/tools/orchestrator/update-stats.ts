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

export const handleUpdateStats: ToolHandler<UpdateStatsArgs> = async (args) => {
  try {
    const validated = UpdateStatsSchema.parse(args);
    const taskStore = TaskStore.getInstance();
    const agentManager = AgentManager.getInstance();
    
    const stats: any = {
      timestamp: new Date().toISOString()
    };
    
    if (validated.include_tasks) {
      const tasks = await taskStore.getTasks();
      stats.tasks = {
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
    
    if (validated.include_sessions) {
      const sessions = agentManager.getAllSessions();
      stats.sessions = {
        total: sessions.length,
        active: sessions.filter(s => s.status === 'active' || s.status === 'busy').length,
        by_type: {
          claude: sessions.filter(s => s.type === 'claude').length,
          gemini: sessions.filter(s => s.type === 'gemini').length
        }
      };
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