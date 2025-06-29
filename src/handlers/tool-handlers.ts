/**
 * @file MCP Tool request handlers for Coding Agent Orchestrator
 * @module handlers/tool-handlers
 */

import type {
  CallToolRequest,
  CallToolResult,
  ListToolsRequest,
  ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TOOLS } from '../constants/tools.js';
import { logger } from '../utils/logger.js';
import { jsonSchemaToZod } from '../utils/json-schema-to-zod.js';
import type { MCPToolContext } from '../types/request-context.js';

// Import tool definitions for schema extraction
import { createTask } from '../constants/tool/orchestrator/create-task.js';
import { updateTask } from '../constants/tool/orchestrator/update-task.js';
import { endTask } from '../constants/tool/orchestrator/end-task.js';
import { reportTask } from '../constants/tool/orchestrator/report-task.js';
import { checkStatus } from '../constants/tool/orchestrator/check-status.js';
import { cleanState } from '../constants/tool/orchestrator/clean-state.js';

// Import tool handlers
import { handleCreateTask } from './tools/orchestrator/create-task.js';
import { handleUpdateTask } from './tools/orchestrator/update-task.js';
import { handleEndTask } from './tools/orchestrator/end-task.js';
import { handleReportTask } from './tools/orchestrator/report-task.js';
import { handleCheckStatus } from './tools/orchestrator/check-status.js';
import { handleCleanState } from './tools/orchestrator/clean-state.js';

/**
 * Zod schemas derived from tool definitions
 */
const ToolSchemas = {
  create_task: jsonSchemaToZod(createTask.inputSchema),
  update_task: jsonSchemaToZod(updateTask.inputSchema),
  end_task: jsonSchemaToZod(endTask.inputSchema),
  report: jsonSchemaToZod(reportTask.inputSchema),
  check_status: jsonSchemaToZod(checkStatus.inputSchema),
  clean_state: jsonSchemaToZod(cleanState.inputSchema)
};

/**
 * Handles MCP tool listing requests
 */
export async function handleListTools(_request: ListToolsRequest): Promise<ListToolsResult> {
  try {
    const tools = [...TOOLS].sort((a, b) => a.name.localeCompare(b.name));
    return { tools };
  } catch (error) {
    logger.error("Failed to list tools", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { tools: TOOLS };
  }
}

/**
 * Handles MCP tool invocation requests
 */
export async function handleToolCall(
  request: CallToolRequest,
  context: MCPToolContext,
): Promise<CallToolResult> {
  
  try {
    logger.info(`🔧 handleToolCall called for tool: ${request.params.name}`);
    logger.info('Full request:', JSON.stringify(request, null, 2));
    logger.debug('Tool arguments:', JSON.stringify(request.params.arguments, null, 2));
    
    if (!request.params.arguments) {
      logger.error("Tool call missing required arguments", { toolName: request.params?.name });
      throw new Error("Arguments are required");
    }

    const tool = TOOLS.find((t) => t.name === request.params.name);
    if (!tool) {
      logger.error("Unknown tool requested", { toolName: request.params.name });
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    // Validate arguments using Zod schema
    const toolName = request.params.name as keyof typeof ToolSchemas;
    const schema = ToolSchemas[toolName];
    
    if (!schema) {
      logger.error("No Zod schema found for tool", { toolName });
      throw new Error(`No validation schema found for tool: ${toolName}`);
    }
    
    let args: any;
    try {
      args = schema.parse(request.params.arguments);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error("Tool argument validation failed", { 
          toolName, 
          errors: error.errors,
          arguments: request.params.arguments 
        });
        throw new Error(`Invalid arguments for tool ${toolName}: ${JSON.stringify(error.errors)}`);
      }
      throw error;
    }

    let result: CallToolResult;

    // Route to appropriate handler with context
    logger.info(`[HANDLER] Processing ${request.params.name} for session: ${context.sessionId}`);
    
    switch (request.params.name) {
      case "create_task":
        logger.info('Raw args for create_task:', JSON.stringify(args, null, 2));
        result = await handleCreateTask(args, context);
        break;
      case "update_task":
        result = await handleUpdateTask(args, context);
        break;
      case "end_task":
        result = await handleEndTask(args, context);
        break;
      case "report":
        result = await handleReportTask(args, context);
        break;
      case "check_status":
        result = await handleCheckStatus(args, context);
        break;
      case "clean_state":
        result = await handleCleanState(args, context);
        break;
      default:
        logger.error("Unsupported tool in switch statement", { toolName: request.params.name });
        throw new Error(`Unknown tool: ${request.params.name}`);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Tool call failed", {
      toolName: request.params?.name,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Re-throw the error to be handled by MCP framework
    throw error;
  }
}