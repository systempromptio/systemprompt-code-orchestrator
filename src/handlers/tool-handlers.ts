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
import type { MCPToolContext } from '../types/request-context.js';

// Import tool handlers
import { handleCreateTask } from './tools/orchestrator/create-task.js';
import { handleUpdateTask } from './tools/orchestrator/update-task.js';
import { handleEndTask } from './tools/orchestrator/end-task.js';
import { handleReportTask } from './tools/orchestrator/report-task.js';
import { handleUpdateStats } from './tools/orchestrator/update-stats.js';
import { handleCheckStatus } from './tools/orchestrator/check-status.js';
import { handleCleanState } from './tools/orchestrator/clean-state.js';

/**
 * Zod schemas for tool validation
 */
const ToolSchemas = {
  create_task: z.object({
    title: z.string(),
    description: z.string(),
    model: z.enum(["claude", "gemini"]),
    command: z.string(),
    project_path: z.string(),
    branch: z.string(),
    requirements: z.array(z.string()).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    start_immediately: z.boolean().default(true),
    context: z.object({
      files: z.array(z.string()).optional(),
      system_prompt: z.string().optional(),
      max_turns: z.number().optional(),
      temperature: z.number().optional()
    }).optional(),
    dependencies: z.array(z.string()).optional()
  }),
  
  update_task: z.object({
    task_id: z.string(),
    command: z.string().optional(),
    update: z.object({
      status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled"]).optional(),
      progress: z.number().min(0).max(100).optional(),
      add_requirement: z.string().optional(),
      add_log: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional()
    }).optional(),
    context: z.object({
      add_files: z.array(z.string()).optional(),
      shell_command: z.string().optional(),
      wait_for_completion: z.boolean().default(true),
      timeout: z.number().default(300000)
    }).optional()
  }),
  
  end_task: z.object({
    task_id: z.string(),
    final_command: z.string().optional(),
    status: z.enum(["completed", "failed", "cancelled"]).default("completed"),
    summary: z.string().optional(),
    result: z.any().optional(),
    generate_report: z.boolean().default(true),
    cleanup: z.object({
      save_session_logs: z.boolean().default(true),
      save_code_changes: z.boolean().default(true),
      compress_context: z.boolean().default(false)
    }).optional()
  }),
  
  report_task: z.object({
    task_ids: z.array(z.string()).optional(),
    report_type: z.enum(["summary", "detailed", "progress"]).default("summary"),
    format: z.enum(["json", "markdown"]).default("json")
  }),
  
  update_stats: z.object({
    include_tasks: z.boolean().default(true),
    include_sessions: z.boolean().default(true)
  }),
  
  check_status: z.object({
    test_sessions: z.boolean().default(true),
    verbose: z.boolean().default(false),
    include_tasks: z.boolean().default(true),
    include_sessions: z.boolean().default(true),
    include_tools: z.boolean().default(true),
    include_resources: z.boolean().default(true)
  }),
  
  clean_state: z.object({
    clean_tasks: z.boolean().default(true),
    clean_sessions: z.boolean().default(true),
    keep_recent: z.boolean().default(true),
    force: z.boolean().default(false),
    dry_run: z.boolean().default(false)
  })
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
  _context: MCPToolContext,
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

    // Route to appropriate handler
    switch (request.params.name) {
      case "create_task":
        logger.info('Raw args for create_task:', JSON.stringify(args, null, 2));
        result = await handleCreateTask(args);
        break;
      case "update_task":
        result = await handleUpdateTask(args);
        break;
      case "end_task":
        result = await handleEndTask(args);
        break;
      case "report_task":
        result = await handleReportTask(args);
        break;
      case "update_stats":
        result = await handleUpdateStats(args);
        break;
      case "check_status":
        result = await handleCheckStatus(args);
        break;
      case "clean_state":
        result = await handleCleanState(args);
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