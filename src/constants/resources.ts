import type { Resource } from "@modelcontextprotocol/sdk/types.js";

export const RESOURCES: Resource[] = [
  {
    uri: "agent://status",
    name: "Agent Status",
    mimeType: "application/json",
    description: "Current status and capabilities of the coding agent"
  },
  {
    uri: "agent://tasks",
    name: "Task List",
    mimeType: "application/json", 
    description: "List of all managed tasks"
  },
  {
    uri: "agent://sessions",
    name: "Active Sessions",
    mimeType: "application/json",
    description: "Currently active Claude and Gemini sessions"
  }
];

export const SERVER_INFO = {
  name: "Coding Agent MCP Server",
  version: "1.0.0",
  description: "Orchestrator for Claude Code and Gemini CLI"
};