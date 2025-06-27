import { z } from "zod";
import { formatToolResponse } from "../types.js";
import { logger } from "../../../utils/logger.js";
import { ToolHandler } from "../types.js";
import { TaskStore } from "../../../services/task-store.js";
import { ClaudeCodeService } from "../../../services/claude-code-service.js";
import { TOOLS } from "../../../constants/tools.js";
import { RESOURCES } from "../../../constants/resources.js";

const CheckStatusSchema = z.object({
  test_sessions: z.boolean().default(true),
  verbose: z.boolean().default(false),
  include_tasks: z.boolean().default(true),
  include_sessions: z.boolean().default(true),
  include_tools: z.boolean().default(true),
  include_resources: z.boolean().default(true)
});

type CheckStatusArgs = z.infer<typeof CheckStatusSchema>;

export const handleCheckStatus: ToolHandler<CheckStatusArgs> = async (args) => {
  logger.info('=== handleCheckStatus called ===', { args });
  
  try {
    const validated = CheckStatusSchema.parse(args);
    
    const status = {
      claude: {
        available: false,
        api_key_present: false,
        test_session_success: false,
        error: null as string | null,
        version: null as string | null,
        cli_name: "Claude Code"
      },
      gemini: {
        available: false,
        api_key_present: false,
        test_session_success: false,
        error: null as string | null,
        version: null as string | null,
        cli_name: "Gemini CLI"
      },
      overall_status: "not active" as "active" | "partial" | "not active",
      file_root: {
        configured: false,
        path: null as string | null,
        exists: false,
        is_git_repo: false,
        git_available: false,
        writable: false,
        current_branch: null as string | null
      }
    };

    // Check environment variables
    status.claude.api_key_present = !!process.env.ANTHROPIC_API_KEY;
    status.gemini.api_key_present = !!process.env.GEMINI_API_KEY;

    logger.info('Environment check', {
      anthropic_key_present: status.claude.api_key_present,
      gemini_key_present: status.gemini.api_key_present
    });

    // Check Claude Code CLI availability
    try {
      const { execSync } = await import('child_process');
      
      try {
        logger.info('Checking Claude Code version...');
        const version = execSync('claude --version', { 
          encoding: 'utf-8',
          env: { ...process.env },
          timeout: 30000
        }).trim();
        status.claude.version = version;
        status.claude.available = true;
        logger.info(`Claude Code version: ${version}`);
      } catch (e: unknown) {
        status.claude.error = "Claude Code CLI not available";
        logger.error('Claude Code CLI check failed', e);
      }
    } catch (e: unknown) {
      status.claude.error = e instanceof Error ? e.message : "Failed to check Claude Code";
    }

    // Check file root configuration - this is informational only
    // Claude Code will run on the host machine with the user's provided project paths
    const fileRoot = process.env.FILE_ROOT || 'Not configured - Claude Code uses project paths directly';
    status.file_root.configured = !!process.env.FILE_ROOT;
    status.file_root.path = fileRoot;
    
    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Check if directory exists
      try {
        const stat = await fs.stat(fileRoot);
        status.file_root.exists = stat.isDirectory();
        
        // Check if writable
        try {
          await fs.access(fileRoot, fs.constants.W_OK);
          status.file_root.writable = true;
        } catch {
          status.file_root.writable = false;
        }
      } catch {
        status.file_root.exists = false;
      }
      
      // Check if git is available
      try {
        execSync('git --version', { encoding: 'utf-8' });
        status.file_root.git_available = true;
        
        // Check if it's a git repo
        if (status.file_root.exists) {
          try {
            const gitDir = path.join(fileRoot, '.git');
            await fs.stat(gitDir);
            status.file_root.is_git_repo = true;
            
            // Get current branch
            try {
              const branch = execSync('git branch --show-current', {
                cwd: fileRoot,
                encoding: 'utf-8'
              }).trim();
              status.file_root.current_branch = branch || 'main';
            } catch {
              status.file_root.current_branch = null;
            }
          } catch {
            status.file_root.is_git_repo = false;
          }
        }
      } catch {
        status.file_root.git_available = false;
      }
    } catch (e: unknown) {
      logger.error('Failed to check file root status', e);
    }

    // Check Gemini CLI availability
    try {
      const { execSync } = await import('child_process');
      
      try {
        logger.info('Checking Gemini CLI version...');
        const version = execSync('gemini --version', { 
          encoding: 'utf-8',
          env: { ...process.env },
          timeout: 30000
        }).trim();
        status.gemini.version = version;
        status.gemini.available = true;
        logger.info(`Gemini CLI version: ${version}`);
      } catch (e: unknown) {
        status.gemini.error = "Gemini CLI not available";
        logger.error('Gemini CLI check failed', e);
      }
    } catch (e: unknown) {
      status.gemini.error = e instanceof Error ? e.message : "Failed to check Gemini";
    }

    // Determine overall status
    const claudeActive = status.claude.available && status.claude.api_key_present;
    const geminiActive = status.gemini.available && status.gemini.api_key_present;

    if (claudeActive && geminiActive) {
      status.overall_status = "active";
    } else if (claudeActive || geminiActive) {
      status.overall_status = "partial";
    } else {
      status.overall_status = "not active";
    }

    logger.info(`Status check completed: ${status.overall_status}`, {
      claude: claudeActive,
      gemini: geminiActive
    });

    // Build response
    const response: any = {
      message: `System status: ${status.overall_status}`,
      status: status.overall_status,
      services: {
        claude: {
          status: claudeActive ? "active" : "not active",
          api_key_present: status.claude.api_key_present,
          cli_available: status.claude.available,
          cli_name: status.claude.cli_name
        },
        gemini: {
          status: geminiActive ? "active" : "not active",
          api_key_present: status.gemini.api_key_present,
          cli_available: status.gemini.available,
          cli_name: status.gemini.cli_name
        }
      },
      file_root: {
        path: status.file_root.path,
        configured: status.file_root.configured,
        exists: status.file_root.exists,
        writable: status.file_root.writable,
        is_git_repo: status.file_root.is_git_repo,
        git_available: status.file_root.git_available,
        current_branch: status.file_root.current_branch
      }
    };

    // Add task status if requested
    if (validated.include_tasks) {
      const taskStore = TaskStore.getInstance();
      const tasks = await taskStore.getTasks();
      
      response.tasks = {
        total: tasks.length,
        by_status: {
          pending: tasks.filter(t => t.status === 'pending').length,
          in_progress: tasks.filter(t => t.status === 'in_progress').length,
          completed: tasks.filter(t => t.status === 'completed').length,
          failed: tasks.filter(t => t.status === 'failed').length,
          cancelled: tasks.filter(t => t.status === 'cancelled').length
        },
        active_tasks: tasks
          .filter(t => t.status === 'in_progress')
          .map(t => ({
            id: t.id,
            title: t.title,
            branch: t.branch,
            model: t.assigned_to?.includes('claude') ? 'claude' : 'gemini',
            session_id: t.assigned_to,
            progress: t.progress
          }))
      };
    }

    // Add session status if requested
    if (validated.include_sessions) {
      const claudeService = ClaudeCodeService.getInstance();
      const claudeSessions = claudeService.getAllSessions();
      
      response.sessions = {
        claude: {
          total: claudeSessions.length,
          active: claudeSessions.filter(s => s.status === 'ready' || s.status === 'busy').length,
          sessions: claudeSessions.map(s => ({
            id: s.id,
            status: s.status,
            workingDirectory: s.workingDirectory,
            created_at: s.createdAt,
            last_activity: s.lastActivity
          }))
        },
        gemini: {
          total: 0,
          active: 0,
          sessions: []
        }
      };
    }

    // Add tools information if requested
    if (validated.include_tools) {
      const tools = TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
      
      response.tools = {
        total: tools.length,
        available: tools,
        categories: {
          task_management: ['create_task', 'update_task', 'end_task', 'report_task'],
          system: ['check_status', 'update_stats', 'clean_state']
        }
      };
    }

    // Add resources information if requested
    if (validated.include_resources) {
      const taskStore = TaskStore.getInstance();
      const tasks = await taskStore.getTasks();
      
      // Start with static resources
      const resources = [...RESOURCES];
      
      // Add dynamic task resources
      tasks.forEach(task => {
        resources.push({
          uri: `task://${task.id}`,
          name: `Task: ${task.title}`,
          mimeType: "application/json",
          description: `${task.description} (Status: ${task.status})`
        });
      });
      
      response.resources = {
        total: resources.length,
        static: RESOURCES.length,
        dynamic: tasks.length,
        resources: validated.verbose ? resources : resources.map(r => ({
          uri: r.uri,
          name: r.name
        }))
      };
    }

    // Add verbose information if requested
    if (validated.verbose) {
      response.details = {
        claude: status.claude,
        gemini: status.gemini,
        environment: {
          ANTHROPIC_API_KEY: status.claude.api_key_present ? "***PRESENT***" : "NOT SET",
          GEMINI_API_KEY: status.gemini.api_key_present ? "***PRESENT***" : "NOT SET",
          CLAUDE_CODE_PATH: process.env.CLAUDE_CODE_PATH || "claude-code (default)",
          GEMINI_CLI_PATH: process.env.GEMINI_CLI_PATH || "gemini (default)"
        }
      };
    }

    const toolResponse = formatToolResponse({
      message: response.message,
      result: {
        status: response.status,
        services: response.services,
        file_root: response.file_root,
        ...(response.tasks && { tasks: response.tasks }),
        ...(response.sessions && { sessions: response.sessions }),
        ...(response.tools && { tools: response.tools }),
        ...(response.resources && { resources: response.resources }),
        ...(response.details && { details: response.details })
      }
    });
    
    logger.info('check_status response', {
      status: response.status,
      hasServices: !!response.services,
      hasDetails: !!response.details
    });
    
    return toolResponse;
  } catch (error: unknown) {
    logger.error('=== handleCheckStatus error ===', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof z.ZodError) {
      return formatToolResponse({
        status: "error",
        message: "Invalid check parameters",
        error: {
          type: "validation_error",
          details: error.errors
        }
      });
    }

    return formatToolResponse({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to check status",
      error: {
        type: "status_check_error"
      }
    });
  }
};