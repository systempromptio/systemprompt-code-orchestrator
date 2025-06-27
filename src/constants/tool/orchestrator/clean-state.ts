import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const cleanState: Tool = {
  name: "clean_state",
  description: "Clean up system state by removing completed tasks, terminated sessions, and old logs",
  inputSchema: {
    type: "object",
    properties: {
      clean_tasks: {
        type: "boolean",
        default: true,
        description: "Remove completed, failed, and cancelled tasks"
      },
      clean_sessions: {
        type: "boolean",
        default: true,
        description: "Terminate all inactive sessions"
      },
      keep_recent: {
        type: "boolean",
        default: true,
        description: "Keep tasks/sessions from the last 24 hours"
      },
      force: {
        type: "boolean",
        default: false,
        description: "Force clean all state regardless of status or time"
      },
      dry_run: {
        type: "boolean",
        default: false,
        description: "Show what would be cleaned without actually cleaning"
      }
    },
    required: []
  }
};