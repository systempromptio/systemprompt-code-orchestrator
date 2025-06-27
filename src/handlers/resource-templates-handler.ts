/**
 * @file MCP Resource Templates handlers
 * @module handlers/resource-templates-handler
 * 
 * @remarks
 * This module implements resource templates functionality from the MCP specification.
 * Resource templates allow dynamic resource discovery with parameterized URIs.
 */

import type { 
  ListResourceTemplatesRequest,
  ListResourceTemplatesResult,
  ResourceTemplate
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../utils/logger.js";

// Define resource templates for the coding agent
const RESOURCE_TEMPLATES: ResourceTemplate[] = [
  {
    uriTemplate: "task://{taskId}",
    name: "Task Details",
    description: "Access detailed information about a specific task by its ID",
    mimeType: "application/json"
  },
  {
    uriTemplate: "task://{taskId}/logs",
    name: "Task Logs",
    description: "Access logs for a specific task",
    mimeType: "text/plain"
  },
  {
    uriTemplate: "task://{taskId}/result",
    name: "Task Result",
    description: "Access the result/output of a completed task",
    mimeType: "application/json"
  },
  {
    uriTemplate: "session://{sessionType}/{sessionId}",
    name: "Session Details",
    description: "Access information about active Claude or Gemini sessions",
    mimeType: "application/json"
  },
  {
    uriTemplate: "project://{projectPath}/status",
    name: "Project Status",
    description: "Get status information for a specific project",
    mimeType: "application/json"
  },
  {
    uriTemplate: "branch://{branchName}/tasks",
    name: "Branch Tasks",
    description: "List all tasks associated with a specific git branch",
    mimeType: "application/json"
  },
  {
    uriTemplate: "log://{logType}/{date}",
    name: "System Logs",
    description: "Access system logs by type and date (format: YYYY-MM-DD)",
    mimeType: "text/plain"
  }
];

/**
 * Handle resources/templates/list request
 * 
 * @remarks
 * Returns the list of available resource templates that clients can use
 * to construct dynamic resource URIs.
 */
export async function handleListResourceTemplates(
  _request: ListResourceTemplatesRequest
): Promise<ListResourceTemplatesResult> {
  logger.debug("📋 Listing resource templates", { 
    templateCount: RESOURCE_TEMPLATES.length 
  });

  return {
    resourceTemplates: RESOURCE_TEMPLATES
  };
}

/**
 * Get current resource templates
 */
export function getResourceTemplates(): ResourceTemplate[] {
  return RESOURCE_TEMPLATES;
}

/**
 * Validate if a URI matches any template
 * 
 * @param uri - The URI to validate
 * @returns Object with matched template and extracted parameters, or null
 */
export function matchResourceTemplate(uri: string): { template: ResourceTemplate; params: Record<string, string> } | null {
  for (const template of RESOURCE_TEMPLATES) {
    const regex = createTemplateRegex(template.uriTemplate);
    const match = uri.match(regex);
    
    if (match && match.groups) {
      return {
        template,
        params: match.groups
      };
    }
  }
  
  return null;
}

/**
 * Convert URI template to regex for matching
 */
function createTemplateRegex(template: string): RegExp {
  // Convert {param} to named capture groups
  const pattern = template
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\\{(\w+)\\}/g, '(?<$1>[^/]+)'); // Convert {param} to (?<param>[^/]+)
  
  return new RegExp(`^${pattern}$`);
}

/**
 * Expand a URI template with provided parameters
 * 
 * @param template - The URI template string
 * @param params - Parameters to substitute
 * @returns Expanded URI
 */
export function expandTemplate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] || match;
  });
}