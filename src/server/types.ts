import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

/**
 * MCP session data
 */
export interface MCPSession {
  id: string;
  transport: StreamableHTTPServerTransport;
  server: Server;
  createdAt: Date;
  lastAccessedAt: Date;
}

/**
 * Session manager configuration
 */
export interface SessionConfig {
  sessionTimeout: number;
  maxSessions?: number;
  onSessionExpired?: (sessionId: string) => void;
}

/**
 * MCP error codes
 */
export enum MCPErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ServerError = -32000,
}

/**
 * MCP request context
 */
export interface MCPRequestContext {
  requestId: string;
  sessionId?: string;
  auth?: any;
  startTime: number;
}