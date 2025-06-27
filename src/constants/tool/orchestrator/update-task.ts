import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const updateTask: Tool = {
  name: "update_task",
  description: "Send instructions to an active AI process (Claude Code or Gemini CLI)",
  inputSchema: {
    type: "object",
    properties: {
      process: {
        type: "string",
        description: "The process ID (session ID) of the active AI agent"
      },
      instructions: {
        type: "string",
        description: "Instructions to send to the AI agent"
      }
    },
    required: ["process", "instructions"]
  }
};