import { z } from "zod";
import type { ToolHandler } from "../types.js";
import { formatToolResponse } from "../types.js";
import { TaskStore } from "../../../services/task-store.js";
import { AgentManager } from "../../../services/agent-manager.js";
import { StatePersistence } from "../../../services/state-persistence.js";
import { logger } from "../../../utils/logger.js";

const EndTaskSchema = z.object({
  task_id: z.string(),
  final_command: z.string().optional(),
  status: z.enum(["completed", "failed", "cancelled"]),
  summary: z.string().optional(),
  result: z.any().optional(),
  generate_report: z.boolean().default(true),
  cleanup: z.object({
    save_session_logs: z.boolean().default(true),
    save_code_changes: z.boolean().default(true),
    compress_context: z.boolean().default(false)
  }).optional()
});

type EndTaskArgs = z.infer<typeof EndTaskSchema>;

interface TaskFinalResult {
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
}

/**
 * Ends a task, performs cleanup, and generates final reports
 * @param args - Task termination parameters
 * @returns Summary of task completion with metrics and results
 */
export const handleEndTask: ToolHandler<EndTaskArgs> = async (args) => {
  try {
    const validated = EndTaskSchema.parse(args);
    const taskStore = TaskStore.getInstance();
    const agentManager = AgentManager.getInstance();
    const persistence = StatePersistence.getInstance();
    
    const task = await taskStore.getTask(validated.task_id);
    if (!task) {
      return formatToolResponse({
        status: "error",
        message: `Task ${validated.task_id} not found`,
        error: { type: "task_not_found" }
      });
    }
    
    let finalCommandResult = null;
    if (task.assigned_to && validated.final_command) {
      finalCommandResult = await executeFinalCommand({
        agentManager,
        taskStore,
        task,
        validated,
        sessionId: task.assigned_to
      });
    }
    
    if (task.assigned_to && validated.cleanup?.save_session_logs) {
      await saveSessionLogs({
        agentManager,
        persistence,
        taskStore,
        task,
        sessionId: task.assigned_to
      });
    }
    
    const finalResult = createFinalResult(task, validated);
    
    await taskStore.updateTask(validated.task_id, {
      status: validated.status,
      completed_at: validated.status === 'completed' ? new Date().toISOString() : undefined,
      result: finalResult,
      logs: [`Task ended with status: ${validated.status}`]
    });
    
    let reportPath = null;
    if (validated.generate_report) {
      reportPath = await generateFinalReport({
        persistence,
        taskStore,
        task,
        validated,
        finalResult
      });
    }
    
    if (task.assigned_to) {
      await agentManager.endSession(task.assigned_to);
      await taskStore.addLog(validated.task_id, 'AI session terminated');
    }
    
    return formatToolResponse({
      message: `Task ${validated.status} successfully`,
      result: {
        ...finalResult,
        final_command_result: finalCommandResult,
        report_path: reportPath
      }
    });
    
  } catch (error) {
    logger.error('Failed to end task', error);
    
    if (error instanceof z.ZodError) {
      return formatToolResponse({
        status: "error",
        message: "Invalid end task parameters",
        error: {
          type: "validation_error",
          details: error.errors
        }
      });
    }
    
    return formatToolResponse({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to end task",
      error: {
        type: "task_end_error"
      }
    });
  }
};

/**
 * Executes the final command before ending the task
 */
async function executeFinalCommand(params: {
  agentManager: AgentManager;
  taskStore: TaskStore;
  task: any;
  validated: EndTaskArgs;
  sessionId: string;
}): Promise<any> {
  const { agentManager, taskStore, validated, sessionId } = params;
  
  const session = agentManager.getSession(sessionId);
  if (!session || session.status === 'terminated') {
    return null;
  }
  
  if (session.type === 'gemini' && validated.cleanup?.compress_context) {
    await agentManager.sendCommand(sessionId, {
      command: '/compress'
    });
  }
  
  const result = await agentManager.sendCommand(sessionId, {
    command: validated.final_command!
  });
  
  await taskStore.addLog(validated.task_id, 
    `Final command sent: ${validated.final_command}`
  );
  
  return result;
}

/**
 * Saves session logs for archival
 */
async function saveSessionLogs(params: {
  agentManager: AgentManager;
  persistence: StatePersistence;
  taskStore: TaskStore;
  task: any;
  sessionId: string;
}): Promise<void> {
  const { agentManager, persistence, taskStore, task, sessionId } = params;
  
  const session = agentManager.getSession(sessionId);
  if (!session) return;
  
  const logs = session.output_buffer.join('\n');
  await persistence.saveSessionLog(sessionId, logs);
  await taskStore.addLog(task.id, 
    `Session logs saved: ${logs.length} bytes`
  );
}

/**
 * Creates the final result object with metrics
 */
function createFinalResult(task: any, validated: EndTaskArgs): TaskFinalResult {
  const duration = new Date().getTime() - new Date(task.created_at).getTime();
  
  return {
    task_id: task.id,
    title: task.title,
    status: validated.status,
    duration_ms: duration,
    duration_human: formatDuration(duration),
    total_logs: task.logs.length,
    final_progress: validated.status === 'completed' ? 100 : task.progress,
    summary: validated.summary || `Task ${validated.status}`,
    custom_result: validated.result,
    session_id: task.assigned_to,
    model_used: task.preferred_agent
  };
}

/**
 * Generates a comprehensive final report
 */
async function generateFinalReport(params: {
  persistence: StatePersistence;
  taskStore: TaskStore;
  task: any;
  validated: EndTaskArgs;
  finalResult: TaskFinalResult;
}): Promise<string | null> {
  const { persistence, taskStore, task, validated, finalResult } = params;
  
  const report = {
    task_summary: finalResult,
    requirements: task.requirements,
    logs: task.logs,
    code_changes: validated.cleanup?.save_code_changes ? 
      await analyzeCodeChanges(task) : null,
    timestamp: new Date().toISOString()
  };
  
  const reportId = `${task.id}_final`;
  const reportPath = await persistence.saveReport(reportId, report);
  await taskStore.addLog(validated.task_id, `Report saved: ${reportPath}`);
  
  return reportPath;
}

/**
 * Formats duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Analyzes code changes made during the task
 */
async function analyzeCodeChanges(_task: any): Promise<any> {
  return {
    files_modified: 0,
    lines_added: 0,
    lines_removed: 0,
    summary: "Code change analysis not yet implemented"
  };
}