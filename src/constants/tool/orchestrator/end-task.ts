import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const endTask: Tool = {
  name: "end_task",
  description: "End a task, optionally sending a final command, and clean up the AI model session",
  inputSchema: {
    type: "object",
    properties: {
      task_id: {
        type: "string",
        description: "The ID of the task to end"
      },
      final_command: {
        type: "string",
        description: "Optional final command to send before ending the task"
      },
      status: {
        type: "string",
        enum: ["completed", "failed", "cancelled"],
        default: "completed",
        description: "Final status for the task"
      },
      summary: {
        type: "string",
        description: "Summary of what was accomplished"
      },
      result: {
        type: "object",
        description: "Final result data to store with the task"
      },
      generate_report: {
        type: "boolean",
        default: true,
        description: "Whether to generate a final report for this task"
      },
      cleanup: {
        type: "object",
        properties: {
          save_session_logs: {
            type: "boolean",
            default: true,
            description: "Whether to save the AI session logs"
          },
          save_code_changes: {
            type: "boolean",
            default: true,
            description: "Whether to save a summary of code changes"
          },
          compress_context: {
            type: "boolean",
            default: false,
            description: "Whether to compress the context (Gemini specific)"
          }
        },
        description: "Cleanup options when ending the task"
      }
    },
    required: ["task_id", "status"]
  }
};