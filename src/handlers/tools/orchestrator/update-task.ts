import { z } from "zod";
import type { ToolHandler } from "../types.js";
import { formatToolResponse } from "../types.js";
import { AgentManager } from "../../../services/agent-manager.js";

const UpdateTaskSchema = z.object({
  process: z.string(),
  instructions: z.string()
});

type UpdateTaskArgs = z.infer<typeof UpdateTaskSchema>;

/**
 * Sends new instructions to an active AI agent session
 * @param args - Process ID and instructions to send
 * @returns Result of the command execution
 */
export const handleUpdateTask: ToolHandler<UpdateTaskArgs> = async (args) => {
  try {
    const validated = UpdateTaskSchema.parse(args);
    const agentManager = AgentManager.getInstance();
    
    const session = agentManager.getSession(validated.process);
    if (!session) {
      return formatToolResponse({
        status: "error",
        message: `Process ${validated.process} not found`,
        error: { type: "process_not_found" }
      });
    }
    
    if (session.status !== 'active') {
      return formatToolResponse({
        status: "error",
        message: `Process ${validated.process} is not active (status: ${session.status})`,
        error: { type: "process_not_active" }
      });
    }
    
    const result = await agentManager.sendCommand(validated.process, {
      command: validated.instructions
    });
    
    if (result.success) {
      return formatToolResponse({
        message: "Instructions sent successfully",
        result: {
          process: validated.process,
          instructions_sent: validated.instructions,
          output: result.output
        }
      });
    } else {
      return formatToolResponse({
        status: "error",
        message: `Failed to send instructions: ${result.error}`,
        error: {
          type: "command_failed",
          details: result.error
        }
      });
    }
    
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