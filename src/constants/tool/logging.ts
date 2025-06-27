/**
 * @file MCP Logging tool definition
 * @module constants/tool/logging
 * 
 * @remarks
 * This module defines the MCP logging tool that allows clients to
 * request servers to log messages for debugging purposes.
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/logging | MCP Logging}
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Logging tool definition.
 * 
 * @remarks
 * This tool follows the MCP specification for logging utilities.
 * It allows clients to request the server to log messages with
 * different severity levels for debugging and monitoring purposes.
 * 
 * The tool name `mcp_logging` follows the MCP specification naming
 * convention for standard utility tools.
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/logging#tool-definition | Tool Definition}
 */
export const MCP_LOGGING_TOOL: Tool = {
  name: 'mcp_logging',
  description: 'Request the server to log a message for debugging purposes',
  inputSchema: {
    type: 'object',
    properties: {
      level: {
        type: 'string',
        enum: ['debug', 'info', 'warning', 'error'],
        description: 'The severity level of the log message',
      },
      message: {
        type: 'string',
        description: 'The message to log',
      },
      data: {
        type: 'object',
        description: 'Optional additional data to log (will be JSON stringified)',
        additionalProperties: true,
      },
    },
    required: ['level', 'message'],
  },
};