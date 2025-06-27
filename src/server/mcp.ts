/**
 * @file MCP protocol handler with session management (no authentication)
 * @module server/mcp
 *
 * @remarks
 * This implementation handles multiple concurrent sessions per MCP SDK design:
 * - One Server instance per session
 * - Each Server has its own StreamableHTTPServerTransport
 * - Session isolation and management
 * - No authentication required
 */

import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CreateMessageRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListRootsRequestSchema,
  ListResourceTemplatesRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { serverConfig, serverCapabilities } from "../constants/server/server-config.js";
import { sendSamplingRequest } from "../handlers/sampling.js";
import { handleListTools, handleToolCall } from "../handlers/tool-handlers.js";
import { handleListPrompts, handleGetPrompt } from "../handlers/prompt-handlers.js";
import { handleListResources, handleResourceCall } from "../handlers/resource-handlers.js";
import { handleListRoots } from "../handlers/roots-handlers.js";
import { handleListResourceTemplates } from "../handlers/resource-templates-handler.js";
import { logger } from "../utils/logger.js";
import { rateLimitMiddleware, validateProtocolVersion, requestSizeLimit } from "./middleware.js";

interface SessionInfo {
  server: Server;
  transport: StreamableHTTPServerTransport;
  createdAt: Date;
  lastAccessed: Date;
}

// Interface for MCP Handler
export interface IMCPHandler {
  setupRoutes(app: express.Application): Promise<void>;
  getServerForSession(sessionId: string): Server | undefined;
  getAllServers(): Server[];
  getServer(): Server;
  cleanupSession(sessionId: string): void;
  getActiveSessionCount(): number;
  shutdown(): void;
}

/**
 * MCP Handler with per-session server instances
 */
export class MCPHandler implements IMCPHandler {
  private sessions = new Map<string, SessionInfo>();

  // Session cleanup interval (clear sessions older than 1 hour)
  private cleanupInterval: NodeJS.Timeout;
  private readonly SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Start session cleanup interval
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupOldSessions();
      },
      5 * 60 * 1000,
    ); // Run every 5 minutes
  }

  /**
   * Creates a new server instance with handlers
   */
  private createServer(sessionId: string): Server {
    // Create new server instance for this session
    const server = new Server(serverConfig, serverCapabilities);

    // Tools
    server.setRequestHandler(ListToolsRequestSchema, (request) => {
      logger.debug(`📋 [${sessionId}] Listing tools`);
      return handleListTools(request);
    });

    server.setRequestHandler(CallToolRequestSchema, (request) => {
      logger.debug(`🔧 [${sessionId}] Calling tool: ${request.params.name}`);
      logger.info(`MCP tool request params:`, JSON.stringify(request.params, null, 2));
      logger.info(`MCP tool request full:`, JSON.stringify(request, null, 2));
      return handleToolCall(request, { sessionId });
    });

    // Prompts
    server.setRequestHandler(ListPromptsRequestSchema, () => {
      logger.debug(`📋 [${sessionId}] Listing prompts`);
      return handleListPrompts();
    });

    server.setRequestHandler(GetPromptRequestSchema, (request) => {
      logger.debug(`📝 [${sessionId}] Getting prompt: ${request.params.name}`);
      return handleGetPrompt(request);
    });

    // Resources
    server.setRequestHandler(ListResourcesRequestSchema, () => {
      logger.debug(`📋 [${sessionId}] Listing resources`);
      return handleListResources();
    });

    server.setRequestHandler(ReadResourceRequestSchema, (request) => {
      logger.debug(`📖 [${sessionId}] Reading resource: ${request.params.uri}`);
      return handleResourceCall(request);
    });

    // Sampling
    server.setRequestHandler(CreateMessageRequestSchema, (request) => {
      return sendSamplingRequest(request, { sessionId });
    });

    // Roots
    server.setRequestHandler(ListRootsRequestSchema, (request) => {
      logger.debug(`📁 [${sessionId}] Listing roots`);
      return handleListRoots(request);
    });

    // Resource Templates
    server.setRequestHandler(ListResourceTemplatesRequestSchema, (request) => {
      logger.debug(`📋 [${sessionId}] Listing resource templates`);
      logger.info(`Resource templates request:`, JSON.stringify(request, null, 2));
      return handleListResourceTemplates(request);
    });

    return server;
  }

  /**
   * Sets up routes for the Express app
   */
  async setupRoutes(app: express.Application): Promise<void> {
    // Apply middleware stack (no auth required)
    const mcpMiddleware = [
      rateLimitMiddleware(60000, 100), // 100 requests per minute
      validateProtocolVersion,
      requestSizeLimit(10 * 1024 * 1024), // 10MB max
    ];

    // Main MCP endpoint (public access)
    app.all("/mcp", ...mcpMiddleware, (req, res) => this.handleRequest(req, res));
  }

  /**
   * Handles incoming MCP requests with proper session management
   */
  private async handleRequest(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Set CORS headers
      res.header("Access-Control-Expose-Headers", "mcp-session-id, x-session-id");

      // Extract session ID from headers
      let sessionId =
        (req.headers["mcp-session-id"] as string) || (req.headers["x-session-id"] as string);

      // For init requests, we need to check the request without a session
      // The transport will handle body parsing
      const isInitRequest = !sessionId;

      let sessionInfo: SessionInfo | undefined;

      if (isInitRequest) {
        // Create new session for initialization
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        // Create new server instance for this session
        const server = this.createServer(sessionId);

        // Create new transport for this session
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId!,
          onsessioninitialized: (sid) => {
            logger.info(`🔗 New session initialized: ${sid}`);
          },
        });

        // Connect server to transport (one-to-one relationship)
        await server.connect(transport);

        // Store session info
        sessionInfo = {
          server,
          transport,
          createdAt: new Date(),
          lastAccessed: new Date(),
        };
        this.sessions.set(sessionId, sessionInfo);

        logger.debug(`📝 Created new session with dedicated server: ${sessionId}`);

        // Let transport handle the initialization request
        await transport.handleRequest(req, res);
      } else {
        // Find existing session
        if (!sessionId) {
          res.status(400).json({
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message: "Invalid Request: Missing session ID",
            },
            id: null,
          });
          return;
        }

        sessionInfo = this.sessions.get(sessionId);
        if (!sessionInfo) {
          res.status(404).json({
            jsonrpc: "2.0",
            error: {
              code: -32001,
              message: "Session not found",
            },
            id: null,
          });
          return;
        }

        sessionInfo.lastAccessed = new Date();

        // Let the session's transport handle the request
        await sessionInfo.transport.handleRequest(req, res);
      }

      logger.debug(`MCP request completed in ${Date.now() - startTime}ms for session ${sessionId}`);
    } catch (error) {
      logger.error("MCP request failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
      });

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal error",
          },
          id: null,
        });
      }
    }
  }

  /**
   * Clean up old sessions
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, sessionInfo] of this.sessions.entries()) {
      const age = now - sessionInfo.lastAccessed.getTime();
      if (age > this.SESSION_TIMEOUT_MS) {
        // Close server and transport
        sessionInfo.server.close();
        sessionInfo.transport.close();
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`🧹 Cleaned up ${cleaned} old sessions`);
    }
  }

  /**
   * Get the server instance for a specific session
   */
  getServerForSession(sessionId: string): Server | undefined {
    const sessionInfo = this.sessions.get(sessionId);
    return sessionInfo?.server;
  }

  /**
   * Get all active servers
   */
  getAllServers(): Server[] {
    return Array.from(this.sessions.values()).map((info) => info.server);
  }

  /**
   * Get any server instance (for compatibility)
   */
  getServer(): Server {
    const firstSession = this.sessions.values().next().value;
    if (firstSession) {
      return firstSession.server;
    }
    // Create a temporary server if none exist
    return new Server(serverConfig, serverCapabilities);
  }

  /**
   * Clean up session
   */
  cleanupSession(sessionId: string): void {
    const sessionInfo = this.sessions.get(sessionId);
    if (sessionInfo) {
      sessionInfo.server.close();
      sessionInfo.transport.close();
      this.sessions.delete(sessionId);
      logger.debug(`🧹 Cleaned up session: ${sessionId}`);
    }
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Shutdown handler
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all sessions
    for (const sessionInfo of this.sessions.values()) {
      sessionInfo.server.close();
      sessionInfo.transport.close();
    }
    this.sessions.clear();

    logger.info("🛑 MCP Handler shut down");
  }
}

// Global instance for notifications
let mcpHandlerInstance: MCPHandler | null = null;

export function setMCPHandlerInstance(handler: MCPHandler): void {
  mcpHandlerInstance = handler;
}

export function getMCPHandlerInstance(): MCPHandler | null {
  return mcpHandlerInstance;
}
