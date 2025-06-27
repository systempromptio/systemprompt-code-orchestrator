import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const updateTask: Tool = {
  name: "update_task",
  description: "Update an existing task and optionally send commands to the assigned AI model (Claude Code or Gemini CLI)",
  inputSchema: {
    type: "object",
    properties: {
      task_id: {
        type: "string",
        description: "The ID of the task to update"
      },
      command: {
        type: "string",
        description: "Command to send to the AI model working on this task (optional - only works if task has an active session)"
      },
      update: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["pending", "in_progress", "completed", "failed", "cancelled"],
            description: "New status for the task"
          },
          progress: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Progress percentage (0-100)"
          },
          add_requirement: {
            type: "string",
            description: "Add a new requirement to the task"
          },
          add_log: {
            type: "string",
            description: "Add a log entry to the task"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "Update task priority"
          }
        },
        description: "Task properties to update"
      },
      context: {
        type: "object",
        properties: {
          add_files: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Additional files to add to the AI model's context"
          },
          shell_command: {
            type: "string",
            description: "Shell command to execute (Gemini: ! prefix, Claude: through command)"
          },
          wait_for_completion: {
            type: "boolean",
            default: true,
            description: "Whether to wait for the command to complete"
          },
          timeout: {
            type: "number",
            default: 300000,
            description: "Command timeout in milliseconds"
          }
        },
        description: "Additional context for the command"
      }
    },
    required: ["task_id"]
  }
};