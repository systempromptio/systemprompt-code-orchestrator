/**
 * Dynamic tool definitions based on availability
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getAvailableTools } from "./tool-availability.js";

/**
 * Create the create_task tool definition with only available tools in the enum
 */
export function getCreateTaskTool(): Tool {
  const availableTools = getAvailableTools();
  
  // If no tools are available, include both but the handler will reject
  const toolEnum = availableTools.length > 0 ? availableTools : ["CLAUDECODE", "GEMINICLI"];
  
  return {
    name: "create_task",
    description: `Create a new task and start it immediately with ${
      availableTools.length === 2 ? "Claude Code or Gemini CLI" :
      availableTools.length === 1 ? availableTools[0] === "CLAUDECODE" ? "Claude Code" : "Gemini CLI" :
      "an AI tool (none currently available)"
    }`,
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short, descriptive title for the task"
        },
        tool: {
          type: "string",
          enum: toolEnum,
          description: `Which AI tool to use for this task. Available: ${
            availableTools.length > 0 ? availableTools.join(", ") : "None (tools not configured)"
          }`
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
}