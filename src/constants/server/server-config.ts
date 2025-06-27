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
 * This serves as a reference implementation for developers building their own MCP servers.
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
 * - OAuth 2.1 authentication flow
 * - Real-world API integration (Reddit)
 */
export const serverConfig: Implementation = {
  name: "systemprompt-mcp-server-full",
  version: "1.0.0",
  metadata: {
    name: "SystemPrompt MCP Server Full Example",
    description:
      "Complete example MCP server implementation demonstrating full specification support with type safety. " +
      "Shows OAuth 2.1, tools, prompts, resources, sampling, and notifications using Reddit as a real-world integration. " +
      "Perfect template for building your own type-safe MCP servers.",
    icon: "logos:reddit-icon",
    color: "orange",
    serverStartTime: Date.now(),
    environment: process.env.NODE_ENV || "production",
    customData: {
      serverType: "example-implementation",
      implementationFeatures: [
        "full-mcp-spec",
        "type-safe",
        "oauth-2.1",
        "sampling",
        "elicitation", 
        "structured-data",
        "notifications",
        "session-management"
      ],
      exampleIntegration: "reddit-api",
      templateUsage: "Fork this repository as a starting point for your own MCP server",
      redditScopes: [
        "identity",
        "read",
        "submit",
        "edit",
        "privatemessages",
        "history",
        "mysubreddits",
      ],
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
 * - sampling: AI content generation with human approval
 * - prompts: Predefined prompt templates
 * - resources: Dynamic content the AI can read
 * - logging: Server-side logging capability
 * 
 * This example implements ALL capabilities to serve as a complete reference.
 */
export const serverCapabilities: { capabilities: ServerCapabilities } = {
  capabilities: {
    tools: {},      // Full tool support with type-safe handlers
    sampling: {},   // Complete sampling implementation with callbacks
    prompts: {},    // Dynamic prompt generation
    resources: {},  // Resource listing and reading
    logging: {},    // Client-requested logging support
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
