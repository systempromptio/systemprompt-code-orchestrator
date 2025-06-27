import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const createTask: Tool = {
  name: "create_task",
  description: "Create a new task and optionally start it immediately with Claude Code or Gemini CLI",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Short, descriptive title for the task"
      },
      description: {
        type: "string",
        description: "Detailed description of what needs to be done"
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
      project_path: {
        type: "string",
        description: "Path to the project directory"
      },
      branch: {
        type: "string",
        description: "Git branch name to use for this task (will be created if it doesn't exist)"
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "critical"],
        default: "medium",
        description: "Task priority level"
      },
      start_immediately: {
        type: "boolean",
        default: true,
        description: "Whether to start the task immediately after creation"
      },
    },
    required: ["title", "tool", "instructions", "project_path", "branch"]
  }
};