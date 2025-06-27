/**
 * @file MCP Roots handlers
 * @module handlers/roots-handlers
 * 
 * @remarks
 * This module implements the roots functionality from the MCP specification.
 * Roots define filesystem boundaries that servers can access within a client.
 */

import type { 
  ListRootsRequest,
  ListRootsResult,
  Root
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../utils/logger.js";
import { sendRootsListChangedNotification } from "./notifications.js";

// Define our server's accessible roots
const SERVER_ROOTS: Root[] = [
  {
    uri: "file:///var/www/html/systemprompt-coding-agent",
    name: "SystemPrompt MCP Server Root"
  },
  {
    uri: "file:///tmp",
    name: "Temporary Files"
  }
];

/**
 * Handle roots/list request
 * 
 * @remarks
 * Returns the list of filesystem roots this server has access to.
 * Clients use this to understand which directories the server can work with.
 */
export async function handleListRoots(
  _request: ListRootsRequest
): Promise<ListRootsResult> {
  logger.debug("📁 Listing roots", { 
    rootCount: SERVER_ROOTS.length 
  });

  return {
    roots: SERVER_ROOTS
  };
}

/**
 * Get current roots for notifications
 */
export function getCurrentRoots(): Root[] {
  return SERVER_ROOTS;
}

/**
 * Update roots (for dynamic root management)
 * 
 * @remarks
 * This could be enhanced to support dynamic root management
 * based on configuration or runtime changes.
 */
export async function updateRoots(newRoots: Root[]): Promise<void> {
  // In a real implementation, you might:
  // 1. Validate the new roots
  // 2. Update the SERVER_ROOTS array
  // 3. Emit a roots/list_changed notification
  
  logger.info("🔄 Roots update requested", { 
    newRootCount: newRoots.length 
  });
  
  // Example of how to emit a roots changed notification
  // In production, you'd update SERVER_ROOTS first
  try {
    await sendRootsListChangedNotification();
    logger.debug("📡 Sent roots/list_changed notification");
  } catch (error) {
    logger.error("Failed to send roots changed notification", { error });
  }
}