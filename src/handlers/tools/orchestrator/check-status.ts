import { z } from "zod";
import { formatToolResponse } from "../types.js";
import { logger } from "../../../utils/logger.js";
import { ToolHandler } from "../types.js";
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

const CheckStatusSchema = z.object({
  test_sessions: z.boolean().default(true),
  verbose: z.boolean().default(false)
});

type CheckStatusArgs = z.infer<typeof CheckStatusSchema>;

interface ServiceStatus {
  available: boolean;
  api_key_present: boolean;
  test_session_success: boolean;
  error: string | null;
  version: string | null;
  cli_name: string;
}

interface FileRootStatus {
  configured: boolean;
  path: string | null;
  exists: boolean;
  is_git_repo: boolean;
  git_available: boolean;
  writable: boolean;
  current_branch: string | null;
}

interface SystemStatus {
  claude: ServiceStatus;
  gemini: ServiceStatus;
  overall_status: "active" | "partial" | "not active";
  file_root: FileRootStatus;
}

/**
 * Checks the status of Claude Code SDK and Gemini CLI availability
 * @param args - Check status parameters
 * @returns Comprehensive status report of all services and system state
 */
export const handleCheckStatus: ToolHandler<CheckStatusArgs> = async (args) => {
  logger.info('=== handleCheckStatus called ===', { args });
  
  try {
    const validated = CheckStatusSchema.parse(args);
    
    const status: SystemStatus = {
      claude: {
        available: false,
        api_key_present: false,
        test_session_success: false,
        error: null,
        version: null,
        cli_name: "Claude Code"
      },
      gemini: {
        available: false,
        api_key_present: false,
        test_session_success: false,
        error: null,
        version: null,
        cli_name: "Gemini CLI"
      },
      overall_status: "not active",
      file_root: {
        configured: false,
        path: null,
        exists: false,
        is_git_repo: false,
        git_available: false,
        writable: false,
        current_branch: null
      }
    };

    status.claude.api_key_present = !!process.env.ANTHROPIC_API_KEY;
    status.gemini.api_key_present = !!process.env.GEMINI_API_KEY;

    logger.info('Environment check', {
      anthropic_key_present: status.claude.api_key_present,
      gemini_key_present: status.gemini.api_key_present
    });

    await checkClaudeCodeAvailability(status.claude);
    await checkFileRootConfiguration(status.file_root);
    await checkGeminiCliAvailability(status.gemini);

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

    const response = buildStatusResponse(status, validated);
    
    logger.info('check_status response', {
      status: response.status,
      hasServices: !!response.services,
      hasDetails: !!response.details
    });
    
    return formatToolResponse({
      message: response.message,
      result: response
    });
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

/**
 * Checks Claude Code CLI availability and version
 */
async function checkClaudeCodeAvailability(claudeStatus: ServiceStatus): Promise<void> {
  try {
    logger.info('Checking Claude Code version...');
    const version = execSync('claude --version', { 
      encoding: 'utf-8',
      env: { ...process.env },
      timeout: 30000
    }).trim();
    claudeStatus.version = version;
    claudeStatus.available = true;
    logger.info(`Claude Code version: ${version}`);
  } catch (e: unknown) {
    claudeStatus.error = "Claude Code CLI not available";
    logger.error('Claude Code CLI check failed', e);
  }
}

/**
 * Checks Gemini CLI availability and version
 */
async function checkGeminiCliAvailability(geminiStatus: ServiceStatus): Promise<void> {
  try {
    logger.info('Checking Gemini CLI version...');
    const version = execSync('gemini --version', { 
      encoding: 'utf-8',
      env: { ...process.env },
      timeout: 30000
    }).trim();
    geminiStatus.version = version;
    geminiStatus.available = true;
    logger.info(`Gemini CLI version: ${version}`);
  } catch (e: unknown) {
    geminiStatus.error = "Gemini CLI not available";
    logger.error('Gemini CLI check failed', e);
  }
}

/**
 * Checks file root configuration and Git status
 */
async function checkFileRootConfiguration(fileRootStatus: FileRootStatus): Promise<void> {
  const fileRoot = process.env.FILE_ROOT || 'Not configured - Claude Code uses project paths directly';
  fileRootStatus.configured = !!process.env.FILE_ROOT;
  fileRootStatus.path = fileRoot;
  
  try {
    if (process.env.FILE_ROOT) {
      try {
        const stat = await fs.stat(fileRoot);
        fileRootStatus.exists = stat.isDirectory();
        
        try {
          await fs.access(fileRoot, fs.constants.W_OK);
          fileRootStatus.writable = true;
        } catch {
          fileRootStatus.writable = false;
        }
      } catch {
        fileRootStatus.exists = false;
      }
    }
    
    try {
      execSync('git --version', { encoding: 'utf-8' });
      fileRootStatus.git_available = true;
      
      if (fileRootStatus.exists && process.env.FILE_ROOT) {
        try {
          const gitDir = path.join(fileRoot, '.git');
          await fs.stat(gitDir);
          fileRootStatus.is_git_repo = true;
          
          try {
            const branch = execSync('git branch --show-current', {
              cwd: fileRoot,
              encoding: 'utf-8'
            }).trim();
            fileRootStatus.current_branch = branch || 'main';
          } catch {
            fileRootStatus.current_branch = null;
          }
        } catch {
          fileRootStatus.is_git_repo = false;
        }
      }
    } catch {
      fileRootStatus.git_available = false;
    }
  } catch (e: unknown) {
    logger.error('Failed to check file root status', e);
  }
}

/**
 * Builds the status response object
 */
function buildStatusResponse(status: SystemStatus, options: CheckStatusArgs): any {
  const claudeActive = status.claude.available && status.claude.api_key_present;
  const geminiActive = status.gemini.available && status.gemini.api_key_present;
  
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

  if (options.verbose) {
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

  return response;
}