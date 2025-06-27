import { z } from "zod";
import type { ToolHandler } from "../types.js";
import { formatToolResponse } from "../types.js";
import { TaskStore } from "../../../services/task-store.js";
import { AgentManager } from "../../../services/agent-manager.js";

const UpdateTaskSchema = z.object({
  task_id: z.string(),
  command: z.string().optional(),
  update: z.object({
    status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled"]).optional(),
    progress: z.number().min(0).max(100).optional(),
    add_requirement: z.string().optional(),
    add_log: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional()
  }).optional(),
  context: z.object({
    add_files: z.array(z.string()).optional(),
    shell_command: z.string().optional(),
    wait_for_completion: z.boolean().default(true),
    timeout: z.number().default(300000)
  }).optional()
});

type UpdateTaskArgs = z.infer<typeof UpdateTaskSchema>;

export const handleUpdateTask: ToolHandler<UpdateTaskArgs> = async (args) => {
  try {
    const validated = UpdateTaskSchema.parse(args);
    const taskStore = TaskStore.getInstance();
    const agentManager = AgentManager.getInstance();
    
    // Get the task
    const task = await taskStore.getTask(validated.task_id);
    if (!task) {
      return formatToolResponse({
        status: "error",
        message: `Task ${validated.task_id} not found`,
        error: { type: "task_not_found" }
      });
    }
    
    // Check if we need to send a command
    if (validated.command) {
      // Check if task has an active session
      if (!task.assigned_to) {
        return formatToolResponse({
          status: "error",
          message: "Task has no active AI session. Start the task first.",
          error: { type: "no_active_session" }
        });
      }
      
      // Get the session
      const session = agentManager.getSession(task.assigned_to);
      if (!session || session.status === 'terminated') {
        return formatToolResponse({
          status: "error",
          message: "AI session is not active",
          error: { type: "session_not_active" }
        });
      }
    }
    
    // Update task properties if provided
    if (validated.update) {
      const updates: any = {};
      
      if (validated.update.status) updates.status = validated.update.status;
      if (validated.update.progress !== undefined) updates.progress = validated.update.progress;
      if (validated.update.priority) updates.priority = validated.update.priority;
      
      if (validated.update.add_requirement) {
        const currentReqs = [...task.requirements];
        currentReqs.push(validated.update.add_requirement);
        updates.requirements = currentReqs;
      }
      
      if (Object.keys(updates).length > 0) {
        await taskStore.updateTask(validated.task_id, updates);
      }
      
      if (validated.update.add_log) {
        await taskStore.addLog(validated.task_id, validated.update.add_log);
      }
    }
    
    let commandResult = null;
    
    // Send command if provided and session exists
    if (validated.command && task.assigned_to) {
      const session = agentManager.getSession(task.assigned_to);
      
      // Prepare command with context
      let fullCommand = validated.command;
      
      // Handle file context for Gemini
      if (session?.type === 'gemini' && validated.context?.add_files) {
        const fileContext = validated.context.add_files
          .map(file => `@${file}`)
          .join(' ');
        fullCommand = `${fileContext} ${fullCommand}`;
      }
      
      // Handle shell commands
      if (validated.context?.shell_command) {
        if (session?.type === 'gemini') {
          // Gemini uses ! prefix for shell commands
          fullCommand = `!${validated.context.shell_command}`;
        } else {
          // Claude handles shell commands through the command itself
          fullCommand = `Execute this shell command: ${validated.context.shell_command}`;
        }
      }
      
      // Send command to AI
      await taskStore.addLog(validated.task_id, `Sending command: ${fullCommand}`);
      
      const result = await agentManager.sendCommand(task.assigned_to, {
        command: fullCommand,
        timeout: validated.context?.timeout
      });
      
      commandResult = result;
      
      if (result.success) {
        await taskStore.addLog(validated.task_id, `Command executed successfully`);
        if (result.output) {
          await taskStore.addLog(validated.task_id, `Output: ${result.output.substring(0, 500)}...`);
        }
      } else {
        await taskStore.addLog(validated.task_id, `Command failed: ${result.error}`);
      }
      
      // Update progress based on command result
      if (result.success && validated.update?.progress === undefined) {
        // Auto-increment progress if not explicitly set
        const newProgress = Math.min(task.progress + 10, 90);
        await taskStore.updateProgress(validated.task_id, newProgress);
      }
    }
    
    return formatToolResponse({
      message: validated.command ? "Task updated and command sent" : "Task updated",
      result: {
        task_id: validated.task_id,
        command_sent: validated.command || null,
        command_result: commandResult,
        current_status: (await taskStore.getTask(validated.task_id))?.status,
        current_progress: (await taskStore.getTask(validated.task_id))?.progress
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return formatToolResponse({
        status: "error",
        message: "Invalid update parameters",
        error: {
          type: "validation_error",
          details: error.errors
        }
      });
    }
    
    return formatToolResponse({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to update task",
      error: {
        type: "task_update_error"
      }
    });
  }
};