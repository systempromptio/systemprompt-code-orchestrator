/**
 * @file Request context types for MCP handlers
 * @module types/request-context
 * 
 * @remarks
 * This module defines the context types passed to MCP handler functions.
 * These types ensure type safety for session information throughout
 * the request lifecycle.
 */


/**
 * Context passed from MCP server to tool handler functions.
 * 
 * @remarks
 * This context provides session information for handlers to track state.
 * 
 * @example
 * ```typescript
 * export async function handleTool(
 *   args: ToolArgs,
 *   context: MCPToolContext
 * ): Promise<ToolResult> {
 *   const { sessionId } = context;
 *   // Use context for session tracking
 * }
 * ```
 */
export interface AuthInfo {
  readonly userId?: string;
  readonly token?: string;
  readonly roles?: string[];
  readonly permissions?: string[];
  readonly metadata?: Record<string, unknown>;
}

export interface MCPToolContext {
  /**
   * Unique session identifier for the current MCP connection.
   * Used to track per-session state and route notifications.
   */
  sessionId: string;
  
  /**
   * Optional authentication information for future use.
   */
  authInfo?: AuthInfo;
}

