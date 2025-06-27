import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const updateStats: Tool = {
  name: "update_stats",
  description: "Get current statistics on tasks and active sessions",
  inputSchema: {
    type: "object",
    properties: {
      include_tasks: {
        type: "boolean",
        default: true,
        description: "Include task statistics"
      },
      include_sessions: {
        type: "boolean",
        default: true,
        description: "Include session statistics"
      }
    }
  }
};