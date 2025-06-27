/**
 * @file MCP Server configuration and capabilities - Example Implementation
 * @module constants/server/server-config
 *
 * @remarks
 * This module defines the server metadata and capabilities for this example MCP server
 * implementation. It demonstrates how to properly configure a type-safe MCP server
 * that implements the full MCP specification including tools, prompts, resources,
 * sampling, and OAuth 2.1 authentication.
 *
 * This implementation provides a coding agent orchestrator that manages Claude Code CLI
 * and Gemini CLI sessions to perform coding tasks.
 *
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/server | MCP Server Specification}
 */

import type { Implementation, ServerCapabilities } from "@modelcontextprotocol/sdk/types.js";

/**
 * Server implementation metadata
 *
 * @remarks
 * Provides identifying information about this example MCP server implementation.
 * This demonstrates proper type-safe configuration with full specification support.
 * 
 * Key features demonstrated:
 * - Complete MCP specification implementation
 * - Type-safe TypeScript architecture
 * - Production-ready patterns and best practices
 * - Task orchestration for coding agents
 * - Integration with Claude Code and Gemini CLIs
 */
export const serverConfig: Implementation = {
  name: "systemprompt-coding-agent",
  version: "1.0.0",
  metadata: {
    name: "SystemPrompt Coding Agent",
    description:
      "MCP server for orchestrating Claude Code CLI and Gemini CLI sessions to perform coding tasks. " +
      "Provides tools for managing coding agents, task execution, and state persistence. " +
      "Perfect for automating complex coding workflows across multiple AI assistants.",
    icon: "code",
    color: "blue",
    serverStartTime: Date.now(),
    environment: process.env.NODE_ENV || "production",
    customData: {
      serverType: "coding-agent-orchestrator",
      implementationFeatures: [
        "task-orchestration",
        "agent-management",
        "state-persistence",
        "elicitation", 
        "structured-data",
        "notifications",
        "session-management"
      ],
      supportedAgents: ["claude-code-cli", "gemini-cli"],
      capabilities: "Orchestrates multiple AI coding assistants to complete complex tasks",
    },
  },
};

/**
 * Server capabilities declaration
 * 
 * @remarks
 * This declares all MCP capabilities that this example server supports.
 * Each capability corresponds to a feature in the MCP specification:
 * 
 * - tools: Interactive functions the AI can call
 * - prompts: Predefined prompt templates
 * - resources: Dynamic content the AI can read
 * - logging: Server-side logging capability
 * 
 * This example implements ALL capabilities to serve as a complete reference.
 */
export const serverCapabilities: { capabilities: ServerCapabilities } = {
  capabilities: {
    tools: {},      // Full tool support with type-safe handlers
    prompts: {},    // Dynamic prompt generation
    resources: {},  // Resource listing and reading
    logging: {},    // Client-requested logging support
    roots: {        // Filesystem roots support
      listChanged: true  // We support roots/list_changed notifications
    },
    resourceTemplates: {},  // Resource templates support for dynamic URIs
  },
};

/**
 * Additional server configuration constants
 */
export const SERVER_CONFIG = {
  SESSION_TIMEOUT: 30 * 60 * 1000,
  MAX_SESSIONS: 100,
  RATE_LIMIT: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
  },
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  PROTOCOL_VERSION: "2025-06-18",
  SDK_VERSION: "@modelcontextprotocol/sdk@1.13.0",
} as const;
