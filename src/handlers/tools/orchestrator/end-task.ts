import { z } from "zod";
import type { ToolHandler } from "../types.js";
import { formatToolResponse } from "../types.js";
import { TaskStore } from "../../../services/task-store.js";
import { AgentManager } from "../../../services/agent-manager.js";
import { StatePersistence } from "../../../services/state-persistence.js";

const EndTaskSchema = z.object({
  task_id: z.string(),
  final_command: z.string().optional(),
  status: z.enum(["completed", "failed", "cancelled"]).default("completed"),
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

export const handleEndTask: ToolHandler<EndTaskArgs> = async (args) => {
  try {
    const validated = EndTaskSchema.parse(args);
    const taskStore = TaskStore.getInstance();
    const agentManager = AgentManager.getInstance();
    const persistence = StatePersistence.getInstance();
    
    // Get the task
    const task = await taskStore.getTask(validated.task_id);
    if (!task) {
      return formatToolResponse({
        status: "error",
        message: `Task ${validated.task_id} not found`,
        error: { type: "task_not_found" }
      });
    }
    
    // Send final command if provided and session is active
    let finalCommandResult = null;
    if (task.assigned_to && validated.final_command) {
      const session = agentManager.getSession(task.assigned_to);
      if (session && session.status !== 'terminated') {
        // Special handling for Gemini compress context
        if (session.type === 'gemini' && validated.cleanup?.compress_context) {
          await agentManager.sendCommand(task.assigned_to, {
            command: '/compress'
          });
        }
        
        finalCommandResult = await agentManager.sendCommand(task.assigned_to, {
          command: validated.final_command
        });
        
        await taskStore.addLog(validated.task_id, 
          `Final command sent: ${validated.final_command}`
        );
      }
    }
    
    // Save session logs if requested
    if (task.assigned_to && validated.cleanup?.save_session_logs) {
      const session = agentManager.getSession(task.assigned_to);
      if (session) {
        const logs = session.output_buffer.join('\n');
        await persistence.saveSessionLog(task.assigned_to, logs);
        await taskStore.addLog(validated.task_id, 
          `Session logs saved: ${logs.length} bytes`
        );
      }
    }
    
    // Calculate final metrics
    const duration = new Date().getTime() - new Date(task.created_at).getTime();
    const finalResult = {
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
    
    // Update task with final status
    await taskStore.updateTask(validated.task_id, {
      status: validated.status,
      progress: validated.status === 'completed' ? 100 : task.progress,
      result: finalResult,
      logs: [`Task ended with status: ${validated.status}`]
    });
    
    // Generate report if requested
    let reportPath = null;
    if (validated.generate_report) {
      const report = {
        task_summary: finalResult,
        requirements: task.requirements,
        logs: task.logs,
        code_changes: validated.cleanup?.save_code_changes ? 
          await analyzeCodeChanges(task) : null,
        timestamp: new Date().toISOString()
      };
      
      const reportId = `${task.id}_final`;
      reportPath = await persistence.saveReport(reportId, report);
      await taskStore.addLog(validated.task_id, `Report saved: ${reportPath}`);
    }
    
    // End the AI session
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

async function analyzeCodeChanges(_task: any): Promise<any> {
  // This would analyze git diff or track file changes
  // For now, return a placeholder
  return {
    files_modified: 0,
    lines_added: 0,
    lines_removed: 0,
    summary: "Code change analysis not yet implemented"
  };
}