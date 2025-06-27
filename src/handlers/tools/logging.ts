/**
 * @file MCP Logging tool implementation
 * @module handlers/tools/logging
 * 
 * @remarks
 * This module implements the MCP logging tool that sends log messages
 * to the MCP client for debugging and monitoring purposes. This follows
 * the MCP specification for client-side logging, NOT server-side logging.
 * 
 * The MCP logging feature allows servers to send log messages to clients
 * at various levels (debug, info, warning, error). These logs appear in
 * the client's console or logging interface, not in the server's logs.
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/logging | MCP Logging}
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolHandlerContext } from './types.js';
import { getMCPHandlerInstance } from '../../server/mcp.js';

/**
 * Handles the MCP logging tool requests.
 * 
 * @remarks
 * This tool sends log messages to the MCP client using the MCP SDK's
 * logging functionality. The logs appear in the client's console or
 * logging interface, allowing for debugging and monitoring of server
 * operations from the client side.
 * 
 * According to the MCP specification, servers can send logging messages
 * to clients as notifications. This is different from server-side logging
 * and is specifically designed for client visibility into server operations.
 * 
 * The tool accepts the following parameters:
 * - `level`: The log level (debug, info, warning, error)
 * - `message`: The message to send to the client
 * - `data`: Optional additional data to include (as JSON)
 * 
 * @param args - Tool arguments containing level, message, and optional data
 * @param context - MCP tool context with session and auth info
 * @returns Success result confirming the log was sent to the client
 * 
 * @example
 * ```json
 * {
 *   "level": "info",
 *   "message": "Reddit search completed successfully",
 *   "data": { "query": "typescript", "results": 10 }
 * }
 * ```
 */
export async function handleLogging(
  args: {
    level: 'debug' | 'info' | 'warning' | 'error';
    message: string;
    data?: any;
  },
  context: ToolHandlerContext
): Promise<CallToolResult> {
  const { level, message, data } = args;
  const { sessionId } = context;

  // Validate log level
  const validLevels = ['debug', 'info', 'warning', 'error'];
  if (!validLevels.includes(level)) {
    throw new Error(`Invalid log level: ${level}. Must be one of: ${validLevels.join(', ')}`);
  }

  // Validate message
  if (!message || typeof message !== 'string') {
    throw new Error('Message is required and must be a string');
  }

  // Get the MCP handler instance to access the server
  const handler = getMCPHandlerInstance();
  if (!handler) {
    throw new Error('MCP handler not initialized');
  }

  // Get the server instance for this session
  const server = handler.getServerForSession(sessionId!);
  if (!server) {
    throw new Error(`No active server found for session: ${sessionId}`);
  }

  // Prepare the log data
  const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
  const fullMessage = `[${level.toUpperCase()}] ${message}${logData}`;

  // Send log message to the client using the MCP server's notification system
  // The MCP SDK will handle sending this as a logging notification to the client
  try {
    // According to MCP spec, logging is sent as notifications to the client
    // The server.sendLoggingMessage method sends logs to the connected client
    await server.notification({
      method: 'notifications/message',
      params: {
        level: level,
        message: fullMessage,
        data: {
          timestamp: new Date().toISOString(),
          sessionId,
          ...(data && { additionalData: data })
        }
      }
    });
  } catch (error) {
    // If we can't send to client, at least log locally for debugging
    console.error(`Failed to send log to MCP client: ${error}`);
  }

  return {
    content: [
      {
        type: 'text',
        text: `Log message sent to client at ${level} level: ${message}`,
      },
    ],
  };
}