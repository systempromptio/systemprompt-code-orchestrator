import { z } from "zod";
import type { ToolHandler } from "../types.js";
import { formatToolResponse } from "../types.js";
import { v4 as uuidv4 } from 'uuid';
import { TaskStore } from "../../../services/task-store.js";
import { AgentManager } from "../../../services/agent-manager.js";
import { ClaudeCodeOptions } from "../../../services/claude-code-service.js";
import { GeminiOptions } from "../../../services/gemini-cli-service.js";
import { execSync } from 'child_process';
import { logger } from "../../../utils/logger.js";
import * as path from 'path';

const CreateTaskSchema = z.object({
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
});

type CreateTaskArgs = z.infer<typeof CreateTaskSchema>;

export const handleCreateTask: ToolHandler<CreateTaskArgs> = async (args) => {
  try {
    const validated = CreateTaskSchema.parse(args);
    const taskStore = TaskStore.getInstance();
    const agentManager = AgentManager.getInstance();
    
    // Use the project path as provided by the user
    const resolvedProjectPath = validated.project_path;
    logger.info(`Using project path: ${resolvedProjectPath}`);
    
    // Generate unique task ID
    const taskId = `task_${uuidv4()}`;
    
    // Create task object
    const task = {
      id: taskId,
      title: validated.title,
      description: validated.description,
      requirements: validated.requirements || [],
      priority: validated.priority,
      estimated_complexity: "moderate" as const,
      preferred_agent: validated.model as "claude" | "gemini",
      project_path: resolvedProjectPath,
      branch: validated.branch,
      dependencies: validated.dependencies || [],
      status: "pending" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assigned_to: null as string | null,
      progress: 0,
      logs: [`Task created with ${validated.model} model`]
    };
    
    // Store task
    await taskStore.createTask(task);
    
    let sessionId: string | null = null;
    let commandResult: any = null;
    
    // Start AI session if requested
    if (validated.start_immediately) {
      try {
        await taskStore.updateTask(taskId, { status: "in_progress" });
        
        // Store the branch information - Claude Code will handle the actual Git operations
        await taskStore.addLog(taskId, `Task will use branch: ${validated.branch}`);
        logger.info(`Task created for branch: ${validated.branch}, Claude Code will handle Git operations`);
        
        if (validated.model === "claude") {
          // Start Claude session with user's project directory
          const claudeOptions: ClaudeCodeOptions = {
            customSystemPrompt: validated.context?.system_prompt,
            maxTurns: validated.context?.max_turns,
            workingDirectory: validated.project_path
          };
          
          sessionId = await agentManager.startClaudeSession({
            project_path: validated.project_path, // Use the user's provided project path
            task_id: taskId,
            options: claudeOptions,
            initial_context: validated.context?.system_prompt
          });
          
          // First, send command to checkout the branch, then the user's command
          try {
            // Send Git checkout command to Claude Code
            await agentManager.sendCommand(sessionId, {
              command: `git checkout -b ${validated.branch} || git checkout ${validated.branch}`
            });
            await taskStore.addLog(taskId, `Sent branch checkout command to Claude Code`);
            
            // Send initial user command
            if (validated.command) {
              const result = await agentManager.sendCommand(sessionId, {
                command: validated.command
              });
              commandResult = result;
            }
          } catch (cmdError) {
            logger.error('Failed to send commands to Claude Code', cmdError);
            await taskStore.addLog(taskId, `Command error: ${cmdError}`);
          }
          
        } else if (validated.model === "gemini") {
          // Start Gemini session
          const geminiOptions: GeminiOptions = {
            temperature: validated.context?.temperature
          };
          
          sessionId = await agentManager.startGeminiSession({
            project_path: resolvedProjectPath,
            task_id: taskId,
            options: geminiOptions
          });
          
          // Add files to context if provided
          if (validated.context?.files && validated.context.files.length > 0) {
            const contextCommand = validated.context.files
              .map(file => `@${file}`)
              .join(' ');
            await agentManager.sendCommand(sessionId, {
              command: contextCommand
            });
          }
          
          // Send initial command
          if (validated.command) {
            const result = await agentManager.sendCommand(sessionId, {
              command: validated.command
            });
            commandResult = result;
          }
        }
        
        // Update task with session assignment
        if (sessionId) {
          task.assigned_to = sessionId;
          await taskStore.updateTask(taskId, { 
            assigned_to: sessionId,
            logs: [`Session ${sessionId} started with ${validated.model}`]
          });
        }
        
      } catch (error) {
        await taskStore.addLog(taskId, `Failed to start session: ${error}`);
        await taskStore.updateTask(taskId, { status: "failed" });
      }
    }
    
    return formatToolResponse({
      message: `Task created successfully${sessionId ? ' and started' : ''}`,
      result: {
        task_id: taskId,
        title: task.title,
        status: task.status,
        model: validated.model,
        session_id: sessionId,
        initial_command_result: commandResult,
        created_at: task.created_at
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Create task validation error:', {
        errors: error.errors,
        received: args
      });
      return formatToolResponse({
        status: "error",
        message: "Invalid task parameters",
        error: {
          type: "validation_error",
          details: error.errors
        }
      });
    }
    
    return formatToolResponse({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to create task",
      error: {
        type: "task_creation_error"
      }
    });
  }
};