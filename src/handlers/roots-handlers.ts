/**
 * @file MCP Roots handlers
 * @module handlers/roots-handlers
 * 
 * @remarks
 * This module implements the roots functionality from the MCP specification.
 * Roots define filesystem boundaries that the daemon has access to on the host machine.
 * 
 * The daemon runs on the host machine (not in Docker) and has access to:
 * 1. The main project directory (HOST_FILE_ROOT)
 * 2. Additional project directories (PROJECTS_PATH)
 * 3. The user's home directory for configuration files
 * 4. Temporary directories for intermediate operations
 * 
 * These roots represent the actual host filesystem paths, not Docker container paths.
 */

import type { 
  ListRootsRequest,
  ListRootsResult,
  Root
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../utils/logger.js";
import { sendRootsListChangedNotification } from "./notifications.js";
import * as path from "path";
import * as os from "os";

/**
 * Get the server roots dynamically based on environment configuration
 * These represent the actual host directories that the daemon has access to
 */
function getServerRoots(): Root[] {
  const roots: Root[] = [];
  
  // Main project root - this is where the daemon executes commands
  const hostFileRoot = process.env.HOST_FILE_ROOT || "/var/www/html/systemprompt-coding-agent";
  roots.push({
    uri: `file://${hostFileRoot}`,
    name: "Main Project Root (Working Directory)"
  });
  
  // Additional projects directory if configured
  const projectsPath = process.env.PROJECTS_PATH;
  if (projectsPath && !projectsPath.startsWith("./")) {
    // Only add if it's an absolute path
    roots.push({
      uri: `file://${projectsPath}`,
      name: "Additional Projects Directory"
    });
  } else if (projectsPath) {
    // Convert relative path to absolute based on HOST_FILE_ROOT
    const absoluteProjectsPath = path.resolve(hostFileRoot, projectsPath);
    roots.push({
      uri: `file://${absoluteProjectsPath}`,
      name: "Additional Projects Directory"
    });
  }
  
  // User's home directory (for accessing .claude.json and other configs)
  const homeDir = process.env.HOME || os.homedir();
  roots.push({
    uri: `file://${homeDir}`,
    name: "User Home Directory"
  });
  
  // Temporary directory for operations
  roots.push({
    uri: "file:///tmp",
    name: "Temporary Files"
  });
  
  // System directories that might be needed
  roots.push({
    uri: "file:///usr/local",
    name: "System Local Directory"
  });
  
  return roots;
}

/**
 * Handle roots/list request
 * 
 * @remarks
 * Returns the list of filesystem roots that the daemon has access to on the host.
 * These are the actual host filesystem paths, not Docker container paths.
 * The daemon runs on the host and can access these directories directly.
 */
export async function handleListRoots(
  _request: ListRootsRequest
): Promise<ListRootsResult> {
  const roots = getServerRoots();
  
  logger.debug("📁 Listing roots (host filesystem paths)", { 
    rootCount: roots.length,
    roots: roots.map(r => ({ uri: r.uri, name: r.name }))
  });

  return {
    roots
  };
}

/**
 * Get current roots for notifications
 * Returns the dynamically calculated roots based on current environment
 */
export function getCurrentRoots(): Root[] {
  return getServerRoots();
}

/**
 * Notify clients about roots changes
 * 
 * @remarks
 * Since roots are calculated dynamically from environment variables,
 * this function just sends a notification that roots may have changed.
 * Clients will re-fetch the roots list to get the updated values.
 */
export async function notifyRootsChanged(): Promise<void> {
  logger.info("🔄 Notifying clients about roots change");
  
  try {
    await sendRootsListChangedNotification();
    logger.debug("📡 Sent roots/list_changed notification");
  } catch (error) {
    logger.error("Failed to send roots changed notification", { error });
  }
}