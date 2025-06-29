import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const createTask: Tool = {
  name: "create_task",
  description: "Create a new task and start it immediately with Claude Code or Gemini CLI",
  inputSchema: {
    type: "object",
    properties: {
      tool: {
        type: "string",
        enum: ["CLAUDECODE", "GEMINICLI"],
        description: "Which AI tool to use for this task. default is CLAUDECODE",
      },
      instructions: {
        type: "string",
        description: "Detailed instructions of what needs to be done",
      },
    },
    required: ["instructions"],
  },
};
