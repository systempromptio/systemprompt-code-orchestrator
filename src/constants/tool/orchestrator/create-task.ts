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
      model: {
        type: "string",
        enum: ["claude", "gemini"],
        description: "Which AI model to use for this task"
      },
      command: {
        type: "string",
        description: "Initial command to send to the AI model when starting the task"
      },
      project_path: {
        type: "string",
        description: "Path to the project directory"
      },
      branch: {
        type: "string",
        description: "Git branch name to use for this task (will be created if it doesn't exist)"
      },
      requirements: {
        type: "array",
        items: {
          type: "string"
        },
        description: "List of specific requirements or acceptance criteria"
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
      context: {
        type: "object",
        properties: {
          files: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Files to add to context (for Gemini @ notation or Claude context)"
          },
          system_prompt: {
            type: "string",
            description: "System prompt for Claude or initial context for Gemini"
          },
          max_turns: {
            type: "number",
            description: "Maximum conversation turns (Claude specific)"
          },
          temperature: {
            type: "number",
            description: "Model temperature setting"
          }
        },
        description: "Additional context and configuration for the AI model"
      },
      dependencies: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Task IDs that must be completed before this task"
      }
    },
    required: ["title", "description", "model", "command", "project_path", "branch"]
  }
};