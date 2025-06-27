/**
 * @file Request context types for MCP handlers
 * @module types/request-context
 * 
 * @remarks
 * This module defines the context types passed to MCP handler functions.
 * These types ensure type safety for authentication data and session
 * information throughout the request lifecycle.
 * 
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/server/authentication | MCP Authentication}
 */

import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

/**
 * Extended authentication information with Reddit-specific data.
 * 
 * @remarks
 * This interface extends the base MCP AuthInfo type to include
 * Reddit OAuth tokens and user information in the extra field.
 * The extra field is populated after successful OAuth authentication.
 * 
 * @example
 * ```typescript
 * const authInfo: RedditAuthInfo = {
 *   clientId: "mcp-client-123",
 *   extra: {
 *     userId: "reddit_username",
 *     redditAccessToken: "access_token_here",
 *     redditRefreshToken: "refresh_token_here"
 *   }
 * };
 * ```
 */
export interface RedditAuthInfo extends AuthInfo {
  /**
   * Extra authentication data containing Reddit-specific information.
   * Populated after successful OAuth flow completion.
   */
  extra?: {
    /** Reddit username of the authenticated user */
    userId?: string;
    /** OAuth access token for Reddit API calls */
    redditAccessToken?: string;
    /** OAuth refresh token for renewing access */
    redditRefreshToken?: string;
  };
}

/**
 * Context passed from MCP server to tool handler functions.
 * 
 * @remarks
 * This context provides all necessary information for handlers to:
 * - Authenticate Reddit API requests
 * - Track session state
 * - Access user-specific data
 * 
 * @example
 * ```typescript
 * export async function handleTool(
 *   args: ToolArgs,
 *   context: MCPToolContext
 * ): Promise<ToolResult> {
 *   const { sessionId, authInfo } = context;
 *   const userId = authInfo.extra?.userId;
 *   // Use context for Reddit API calls
 * }
 * ```
 */
export interface MCPToolContext {
  /**
   * Unique session identifier for the current MCP connection.
   * Used to track per-session state and route notifications.
   */
  sessionId: string;
  
  /**
   * Authentication information including Reddit OAuth tokens.
   * Contains user identity and API credentials.
   */
  authInfo: RedditAuthInfo;
}

