import { z } from "zod";
import type { ToolHandler } from "../types.js";
import { formatToolResponse } from "../types.js";
import { v4 as uuidv4 } from 'uuid';
import { TaskStore } from "../../../services/task-store.js";
import { AgentManager } from "../../../services/agent-manager.js";
import { ClaudeCodeOptions, ClaudeCodeService } from "../../../services/claude-code-service.js";
import { GeminiOptions } from "../../../services/gemini-cli-service.js";
import { logger } from "../../../utils/logger.js";

const CreateTaskSchema = z.object({
  title: z.string(),
  tool: z.enum(["CLAUDECODE", "GEMINICLI"]),
  instructions: z.string(),
  branch: z.string()
});

type CreateTaskArgs = z.infer<typeof CreateTaskSchema>;

export const handleCreateTask: ToolHandler<CreateTaskArgs> = async (args, context) => {
  try {
    const validated = CreateTaskSchema.parse(args);
    const taskStore = TaskStore.getInstance();
    const agentManager = AgentManager.getInstance();
    
    // Use the project path from environment or default root
    const resolvedProjectPath = process.env.PROJECT_ROOT || process.env.PROJECTS_PATH || '/var/www/html/systemprompt-coding-agent';
    logger.info(`Using project path: ${resolvedProjectPath}`);
    
    // Extract session ID from context
    const sessionId = context?.sessionId;
    logger.info(`[CREATE_TASK] Session ID: ${sessionId || 'none'}`);
    
    // Generate unique task ID
    const taskId = `task_${uuidv4()}`;
    
    // Create task object
    const task = {
      id: taskId,
      title: validated.title,
      description: validated.instructions,
      requirements: [],
      priority: "medium" as const,
      estimated_complexity: "moderate" as const,
      preferred_agent: (validated.tool === "CLAUDECODE" ? "claude" : "gemini") as "claude" | "gemini",
      project_path: resolvedProjectPath,
      branch: validated.branch,
      dependencies: [],
      status: "pending" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assigned_to: null as string | null,
      progress: 0,
      logs: [`Task created with ${validated.tool} tool`]
    };
    
    // Store task with session ID for proper notification routing
    await taskStore.createTask(task, sessionId);
    
    let agentSessionId: string | null = null;
    let commandResult: any = null;
    
    // Always start AI session immediately
    try {
        await taskStore.updateTask(taskId, { status: "in_progress" }, sessionId);
        
        // Create the branch in the file system (if Git is available)
        try {
          const { execSync } = await import('child_process');
          const projectPath = resolvedProjectPath;
          
          // Check if it's a git repository
          try {
            execSync('git rev-parse --git-dir', { 
              cwd: projectPath, 
              stdio: 'ignore' 
            });
            
            // Create and checkout the branch
            try {
              execSync(`git checkout -b ${validated.branch}`, {
                cwd: projectPath,
                stdio: 'ignore'
              });
              await taskStore.addLog(taskId, `Created and switched to branch: ${validated.branch}`, sessionId);
            } catch (e) {
              // Branch might already exist, try to checkout
              execSync(`git checkout ${validated.branch}`, {
                cwd: projectPath,
                stdio: 'ignore'
              });
              await taskStore.addLog(taskId, `Switched to existing branch: ${validated.branch}`, sessionId);
            }
          } catch (e) {
            await taskStore.addLog(taskId, `Not a git repository, proceeding without branch: ${validated.branch}`, sessionId);
          }
        } catch (e) {
          logger.warn(`Failed to create branch: ${e}`);
          await taskStore.addLog(taskId, `Failed to create branch: ${e}`, sessionId);
        }
        
        if (validated.tool === "CLAUDECODE") {
          // Start Claude session with user's project directory
          const claudeOptions: ClaudeCodeOptions = {
            workingDirectory: resolvedProjectPath
          };
          
          agentSessionId = await agentManager.startClaudeSession({
            project_path: resolvedProjectPath,
            task_id: taskId,
            options: claudeOptions
          });
          
          // Link the Claude session to the task for proper logging
          const claudeService = ClaudeCodeService.getInstance();
          const agentSession = agentManager.getSession(agentSessionId);
          if (agentSession?.serviceSessionId) {
            claudeService.setTaskId(agentSession.serviceSessionId, taskId);
            await taskStore.addLog(taskId, `[SESSION_LINKED] Claude session ${agentSession.serviceSessionId} linked to task`, sessionId);
          }
          
          // Set up event listeners for task tracking
          const progressHandler = async (data: any) => {
            if (data.taskId === taskId) {
              await taskStore.addLog(taskId, `[PROGRESS] ${data.event}: ${data.data}`, sessionId);
              
              // Update task status based on events
              if (data.event === 'error:occurred') {
                await taskStore.updateTask(taskId, { status: 'failed' }, sessionId);
              }
            }
          };
          
          const streamHandler = async (data: any) => {
            if (data.taskId === taskId) {
              // Stream data is already comprehensively logged in parseProgressFromStream
              // Just track activity for monitoring
              const agentSession = agentSessionId ? agentManager.getSession(agentSessionId) : null;
              if (agentSession) {
                agentSession.last_activity = new Date().toISOString();
              }
            }
          };
          
          claudeService.on('task:progress', progressHandler);
          claudeService.on('stream:data', streamHandler);
          
          // Send initial instructions directly (branch already created)
          try {
            if (validated.instructions) {
              await taskStore.addLog(taskId, `[INSTRUCTIONS_SENDING] Sending initial instructions...`, sessionId);
              
              // The sendCommand promise resolves when Claude completes the task
              const result = await agentManager.sendCommand(agentSessionId!, {
                command: validated.instructions
              });
              
              commandResult = result;
              await taskStore.addLog(taskId, `[INSTRUCTIONS_COMPLETED] Claude has finished processing the instructions`, sessionId);
              await taskStore.updateTask(taskId, { status: 'completed' });
              await taskStore.addLog(taskId, `[TASK_COMPLETED] Task completed successfully`, sessionId);
              
              // Clean up event listeners
              claudeService.off('task:progress', progressHandler);
              claudeService.off('stream:data', streamHandler);
            }
          } catch (cmdError) {
            logger.error('Failed to send instructions to Claude Code', cmdError);
            await taskStore.addLog(taskId, `[ERROR] Instructions error: ${cmdError}`, sessionId);
            await taskStore.updateTask(taskId, { status: 'failed' });
            
            // Clean up event listeners
            claudeService.off('task:progress', progressHandler);
            claudeService.off('stream:data', streamHandler);
          }
          
        } else if (validated.tool === "GEMINICLI") {
          // Start Gemini session
          const geminiOptions: GeminiOptions = {};
          
          agentSessionId = await agentManager.startGeminiSession({
            project_path: resolvedProjectPath,
            task_id: taskId,
            options: geminiOptions
          });
          
          // Send initial instructions
          if (validated.instructions) {
            const result = await agentManager.sendCommand(agentSessionId, {
              command: validated.instructions
            });
            commandResult = result;
          }
        }
        
        // Update task with session assignment
        if (agentSessionId) {
          task.assigned_to = agentSessionId;
          await taskStore.updateTask(taskId, { 
            assigned_to: agentSessionId,
            logs: [`Session ${agentSessionId} started with ${validated.tool}`]
          }, sessionId);
        }
        
    } catch (error) {
      await taskStore.addLog(taskId, `Failed to start session: ${error}`, sessionId);
      await taskStore.updateTask(taskId, { status: "failed" }, sessionId);
    }
    
    return formatToolResponse({
      message: `Task created successfully${agentSessionId ? ' and started' : ''}`,
      result: {
        task_id: taskId,
        title: task.title,
        status: task.status,
        tool: validated.tool,
        session_id: agentSessionId,
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