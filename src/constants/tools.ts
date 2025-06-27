/**
 * @file Tool constants and utilities for the Reddit MCP server
 * @module constants/tools
 * 
 * @remarks
 * This module aggregates all available MCP tools and provides utilities
 * for tool management. Tools are the primary way clients interact with
 * the Reddit API through this MCP server.
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/core/tools | MCP Tools Specification}
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getChannel } from '../constants/tool/get-channel.js';
import { getComment } from '../constants/tool/get-comment.js';
import { getNotifications } from '../constants/tool/get-notifications.js';
import { getPost } from '../constants/tool/get-post.js';
import { searchReddit } from '../constants/tool/search-reddit.js';
import { ELICITATION_EXAMPLE_TOOL } from './tool/elicitation-example.js';
import { SAMPLING_EXAMPLE_TOOL } from './tool/sampling-example.js';
import { STRUCTURED_DATA_EXAMPLE_TOOL } from './tool/structured-data-example.js';
import { MCP_LOGGING_TOOL } from './tool/logging.js';
import { VALIDATION_EXAMPLE_TOOL } from './tool/validation-example.js';
import type { RedditConfigData } from '../types/config.js';

/**
 * Standard error messages for tool operations.
 * 
 * @remarks
 * These messages are used when tool calls fail or when
 * an unknown tool is requested.
 */
export const TOOL_ERROR_MESSAGES = {
  /** Prefix for unknown tool errors */
  UNKNOWN_TOOL: 'Unknown tool:',
  /** Prefix for tool execution failures */
  TOOL_CALL_FAILED: 'Tool call failed:',
} as const;

/**
 * Standard response messages for tool operations.
 * 
 * @remarks
 * These messages are used for special tool responses,
 * such as when a tool triggers an asynchronous operation.
 */
export const TOOL_RESPONSE_MESSAGES = {
  /** Message returned when a tool triggers async processing (e.g., sampling) */
  ASYNC_PROCESSING: 'Request is being processed asynchronously',
} as const;

/**
 * Array of all available MCP tools for Reddit operations.
 * 
 * @remarks
 * Each tool provides specific functionality for interacting with Reddit:
 * - `getChannel`: Fetch subreddit information
 * - `getPost`: Retrieve a specific Reddit post
 * - `getNotifications`: Get user notifications and messages
 * - `searchReddit`: Search across Reddit
 * - `getComment`: Retrieve a specific comment
 * 
 * Example/Tutorial tools:
 * - `elicitation_example`: Demonstrates requesting user input
 * - `sampling_example`: Demonstrates AI-assisted operations
 * - `structured_data_example`: Demonstrates returning structured data
 * 
 * Utility tools:
 * - `mcp_logging`: Request server to log messages for debugging
 * 
 * Tools that modify Reddit content (create, edit, delete) use the sampling
 * feature to generate content with AI assistance.
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/core/tools | MCP Tools}
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/client/sampling | MCP Sampling}
 */
export const TOOLS: Tool[] = [
  getChannel,
  getPost,
  getNotifications,
  searchReddit,
  getComment,
  ELICITATION_EXAMPLE_TOOL,
  SAMPLING_EXAMPLE_TOOL,
  STRUCTURED_DATA_EXAMPLE_TOOL,
  MCP_LOGGING_TOOL,
  VALIDATION_EXAMPLE_TOOL,
];

/**
 * Populates tools with initial data from Reddit configuration.
 * 
 * @remarks
 * This function can be used to inject user-specific data into tools
 * at initialization time. Currently, it creates a clone of each tool
 * to avoid modifying the original tool definitions.
 * 
 * @param tools - Array of tool definitions to populate
 * @param configData - Reddit configuration data containing user info
 * @returns Array of populated tool definitions
 * 
 * @example
 * ```typescript
 * const populatedTools = populateToolsInitialData(TOOLS, redditConfig);
 * ```
 */
export function populateToolsInitialData(tools: Tool[], _configData: RedditConfigData): Tool[] {
  return tools.map((tool) => {
    const clonedTool = { ...tool };
    return clonedTool;
  });
}
