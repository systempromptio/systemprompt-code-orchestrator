import { z } from "zod";
import type { ToolHandler } from "../types.js";
import { formatToolResponse } from "../types.js";
import { v4 as uuidv4 } from 'uuid';
import { TaskStore } from "../../../services/task-store.js";
import { AgentManager } from "../../../services/agent-manager.js";
import { ClaudeCodeOptions, ClaudeCodeService } from "../../../services/claude-code-service.js";
import { GeminiOptions } from "../../../services/gemini-cli-service.js";
import { logger } from "../../../utils/logger.js";
import { execSync } from 'child_process';

const CreateTaskSchema = z.object({
  title: z.string(),
  tool: z.enum(["CLAUDECODE", "GEMINICLI"]),
  instructions: z.string(),
  branch: z.string()
});

type CreateTaskArgs = z.infer<typeof CreateTaskSchema>;

interface Task {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  priority: "low" | "medium" | "high";
  estimated_complexity: "simple" | "moderate" | "complex";
  preferred_agent: "claude" | "gemini";
  project_path: string;
  branch: string;
  dependencies: string[];
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  assigned_to: string | null;
  elapsed_seconds: number;
  logs: string[];
}

/**
 * Creates a new task and optionally starts an AI session to execute it
 * @param args - Task creation parameters
 * @param context - Execution context containing session information
 * @returns Formatted response with task details and session information
 */
export const handleCreateTask: ToolHandler<CreateTaskArgs> = async (args, context) => {
  try {
    const validated = CreateTaskSchema.parse(args);
    const taskStore = TaskStore.getInstance();
    const agentManager = AgentManager.getInstance();
    
    const resolvedProjectPath = process.env.PROJECT_ROOT || process.env.PROJECTS_PATH || '/var/www/html/systemprompt-coding-agent';
    logger.info(`Using project path: ${resolvedProjectPath}`);
    
    const sessionId = context?.sessionId;
    logger.info(`[CREATE_TASK] Session ID: ${sessionId || 'none'}`);
    
    const taskId = `task_${uuidv4()}`;
    
    const task: Task = {
      id: taskId,
      title: validated.title,
      description: validated.instructions,
      requirements: [],
      priority: "medium",
      estimated_complexity: "moderate",
      preferred_agent: validated.tool === "CLAUDECODE" ? "claude" : "gemini",
      project_path: resolvedProjectPath,
      branch: validated.branch,
      dependencies: [],
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assigned_to: null,
      started_at: undefined,
      completed_at: undefined,
      elapsed_seconds: 0,
      logs: [`Task created with ${validated.tool} tool`]
    };
    
    await taskStore.createTask(task, sessionId);
    
    let agentSessionId: string | null = null;
    let commandResult: any = null;
    
    try {
        const startTime = new Date().toISOString();
        await taskStore.updateTask(taskId, { 
          status: "in_progress",
          started_at: startTime
        }, sessionId);
        await taskStore.addLog(taskId, `[TASK_STARTED] Beginning task execution at ${startTime}`, sessionId);
        
        await createGitBranch(resolvedProjectPath, validated.branch, taskId, sessionId, taskStore);
        
        if (validated.tool === "CLAUDECODE") {
          agentSessionId = await startClaudeSession({
            agentManager,
            taskStore,
            resolvedProjectPath,
            taskId,
            sessionId
          });
          const claudeService = ClaudeCodeService.getInstance();
          const { progressHandler, streamHandler } = setupClaudeEventHandlers({
            taskId,
            sessionId,
            agentSessionId,
            taskStore,
            agentManager
          });
          
          claudeService.on('task:progress', progressHandler);
          claudeService.on('stream:data', streamHandler);
          
          try {
            if (validated.instructions) {
              commandResult = await executeClaudeInstructions({
                agentManager,
                taskStore,
                agentSessionId: agentSessionId!,
                taskId,
                sessionId,
                instructions: validated.instructions
              });
            }
          } finally {
            claudeService.off('task:progress', progressHandler);
            claudeService.off('stream:data', streamHandler);
          }
          
        } else if (validated.tool === "GEMINICLI") {
          const geminiResult = await executeGeminiTask({
            agentManager,
            resolvedProjectPath,
            taskId,
            instructions: validated.instructions
          });
          agentSessionId = geminiResult.sessionId;
          commandResult = geminiResult.commandResult;
        }
        
        if (agentSessionId) {
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

/**
 * Creates and checks out a Git branch for the task
 */
async function createGitBranch(
  projectPath: string,
  branchName: string,
  taskId: string,
  sessionId: string | undefined,
  taskStore: TaskStore
): Promise<void> {
  try {
    try {
      execSync('git rev-parse --git-dir', { 
        cwd: projectPath, 
        stdio: 'ignore' 
      });
      
      try {
        execSync(`git checkout -b ${branchName}`, {
          cwd: projectPath,
          stdio: 'ignore'
        });
        await taskStore.addLog(taskId, `Created and switched to branch: ${branchName}`, sessionId);
      } catch (e) {
        execSync(`git checkout ${branchName}`, {
          cwd: projectPath,
          stdio: 'ignore'
        });
        await taskStore.addLog(taskId, `Switched to existing branch: ${branchName}`, sessionId);
      }
    } catch (e) {
      await taskStore.addLog(taskId, `Not a git repository, proceeding without branch: ${branchName}`, sessionId);
    }
  } catch (e) {
    logger.warn(`Failed to create branch: ${e}`);
    await taskStore.addLog(taskId, `Failed to create branch: ${e}`, sessionId);
  }
}

/**
 * Starts a Claude Code session for the task
 */
async function startClaudeSession(params: {
  agentManager: AgentManager;
  taskStore: TaskStore;
  resolvedProjectPath: string;
  taskId: string;
  sessionId: string | undefined;
}): Promise<string> {
  const { agentManager, taskStore, resolvedProjectPath, taskId, sessionId } = params;
  
  const claudeOptions: ClaudeCodeOptions = {
    workingDirectory: resolvedProjectPath
  };
  
  const agentSessionId = await agentManager.startClaudeSession({
    project_path: resolvedProjectPath,
    task_id: taskId,
    options: claudeOptions
  });
  
  const claudeService = ClaudeCodeService.getInstance();
  const agentSession = agentManager.getSession(agentSessionId);
  if (agentSession?.serviceSessionId) {
    claudeService.setTaskId(agentSession.serviceSessionId, taskId);
    await taskStore.addLog(taskId, `[SESSION_LINKED] Claude session ${agentSession.serviceSessionId} linked to task`, sessionId);
  }
  
  return agentSessionId;
}

/**
 * Sets up event handlers for Claude Code progress tracking
 */
function setupClaudeEventHandlers(params: {
  taskId: string;
  sessionId: string | undefined;
  agentSessionId: string | null;
  taskStore: TaskStore;
  agentManager: AgentManager;
}) {
  const { taskId, sessionId, agentSessionId, taskStore, agentManager } = params;
  
  const progressHandler = async (data: any) => {
    if (data.taskId === taskId) {
      await taskStore.addLog(taskId, `[PROGRESS] ${data.event}: ${data.data}`, sessionId);
      
      if (data.event === 'error:occurred') {
        await taskStore.updateTask(taskId, { status: 'failed' }, sessionId);
      }
    }
  };
  
  const streamHandler = async (data: any) => {
    if (data.taskId === taskId) {
      const agentSession = agentSessionId ? agentManager.getSession(agentSessionId) : null;
      if (agentSession) {
        agentSession.last_activity = new Date().toISOString();
      }
    }
  };
  
  return { progressHandler, streamHandler };
}

/**
 * Executes Claude Code instructions and updates task status
 */
async function executeClaudeInstructions(params: {
  agentManager: AgentManager;
  taskStore: TaskStore;
  agentSessionId: string;
  taskId: string;
  sessionId: string | undefined;
  instructions: string;
}): Promise<any> {
  const { agentManager, taskStore, agentSessionId, taskId, sessionId, instructions } = params;
  
  try {
    await taskStore.addLog(taskId, `[INSTRUCTIONS_SENDING] Sending instructions to Claude...`, sessionId);
    
    // Start timer for elapsed time tracking
    const startTime = Date.now();
    const updateElapsedTime = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      await taskStore.updateTask(taskId, { elapsed_seconds: elapsed }, sessionId);
    }, 5000); // Update every 5 seconds
    
    let result: any;
    try {
      // Send the command and let Claude work
      result = await agentManager.sendCommand(agentSessionId, {
        command: instructions
      });
      
      clearInterval(updateElapsedTime);
      const finalElapsed = Math.floor((Date.now() - startTime) / 1000);
      
      await taskStore.addLog(taskId, `[EXECUTION_TIME] Claude execution took ${finalElapsed} seconds`, sessionId);
      
      // Check if the result indicates success
      if (result.success) {
        await taskStore.updateTask(taskId, { 
          status: 'completed',
          elapsed_seconds: finalElapsed
        }, sessionId);
        await taskStore.addLog(taskId, `[TASK_COMPLETED] Task completed successfully`, sessionId);
        
        // Log full output for transparency
        if (result.output) {
          await taskStore.addLog(taskId, `[CLAUDE_OUTPUT]\n${result.output}`, sessionId);
        }
      } else {
        await taskStore.updateTask(taskId, { 
          status: 'failed',
          elapsed_seconds: finalElapsed
        }, sessionId);
        await taskStore.addLog(taskId, `[TASK_FAILED] ${result.error || 'Unknown error'}`, sessionId);
      }
    } catch (error) {
      clearInterval(updateElapsedTime);
      throw error;
    }
    
    return result;
  } catch (cmdError) {
    logger.error('Failed to send instructions to Claude Code', cmdError);
    await taskStore.addLog(taskId, `[ERROR] Instructions error: ${cmdError}`, sessionId);
    await taskStore.updateTask(taskId, { status: 'failed' }, sessionId);
    throw cmdError;
  }
}

/**
 * Executes a Gemini CLI task
 */
async function executeGeminiTask(params: {
  agentManager: AgentManager;
  resolvedProjectPath: string;
  taskId: string;
  instructions: string | undefined;
}): Promise<{ sessionId: string; commandResult: any }> {
  const { agentManager, resolvedProjectPath, taskId, instructions } = params;
  
  const geminiOptions: GeminiOptions = {};
  
  const sessionId = await agentManager.startGeminiSession({
    project_path: resolvedProjectPath,
    task_id: taskId,
    options: geminiOptions
  });
  
  let commandResult = null;
  if (instructions) {
    commandResult = await agentManager.sendCommand(sessionId, {
      command: instructions
    });
  }
  
  return { sessionId, commandResult };
}