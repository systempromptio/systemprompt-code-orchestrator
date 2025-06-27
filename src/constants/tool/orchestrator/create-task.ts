import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const createTask: Tool = {
  name: "create_task",
  description: "Create a new task and start it immediately with Claude Code or Gemini CLI",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Short, descriptive title for the task"
      },
      tool: {
        type: "string",
        enum: ["CLAUDECODE", "GEMINICLI"],
        description: "Which AI tool to use for this task"
      },
      instructions: {
        type: "string",
        description: "Detailed instructions of what needs to be done"
      },
      branch: {
        type: "string",
        description: "Git branch name to use for this task (will be created if it doesn't exist)"
      }
    },
    required: ["title", "tool", "instructions", "branch"]
  }
};