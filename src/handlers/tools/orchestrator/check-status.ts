/**
 * @file Check status orchestrator tool
 * @module handlers/tools/orchestrator/check-status
 */

import type { ToolHandler, CallToolResult, ToolHandlerContext } from '../types.js';
import { formatToolResponse } from '../types.js';
import { logger } from '../../../utils/logger.js';
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as net from 'net';
import {
  type CheckStatusArgs,
  StatusCheckError
} from './utils/index.js';
import {
  isToolAvailable,
  taskOperations,
  agentOperations
} from './utils/index.js';

/**
 * Service status information for AI tools
 */
interface ServiceStatus {
  available: boolean;
  cli_path: string | null;
  error: string | null;
  version: string | null;
  cli_name: string;
  daemon_reachable?: boolean;
  daemon_has_tool?: boolean;
}

/**
 * File root configuration status
 */
interface FileRootStatus {
  configured: boolean;
  docker_path: string | null;
  host_path: string | null;
  exists: boolean;
  is_git_repo: boolean;
  git_available: boolean;
  writable: boolean;
  current_branch: string | null;
  daemon_accessible: boolean;
}

/**
 * Complete system status
 */
interface SystemStatus {
  claude: ServiceStatus;
  gemini: ServiceStatus;
  overall_status: 'active' | 'partial' | 'not active';
  file_root: FileRootStatus;
  active_tasks: number;
  active_sessions: number;
  daemon_status: {
    reachable: boolean;
    host: string;
    port: number;
    tools: string[];
  };
}

/**
 * Status check result
 */
interface StatusCheckResult {
  message: string;
  status: 'active' | 'partial' | 'not active';
  services: {
    claude: {
      status: string;
      cli_available: boolean;
      cli_name: string;
    };
    gemini: {
      status: string;
      cli_available: boolean;
      cli_name: string;
    };
  };
  file_root: FileRootStatus;
  active_tasks?: number;
  active_sessions?: number;
  details?: {
    claude: ServiceStatus;
    gemini: ServiceStatus;
    environment: Record<string, string>;
    tasks?: Array<{
      id: string;
      title: string;
      status: string;
      tool: string;
    }>;
    sessions?: Array<{
      id: string;
      type: string;
      status: string;
      taskId?: string;
    }>;
  };
}

/**
 * Checks the status of Claude Code SDK and Gemini CLI availability
 * 
 * @param args - Check status parameters including verbosity and test options
 * @param context - Execution context containing session information
 * @returns Comprehensive status report of all services and system state
 * 
 * @example
 * ```typescript
 * await handleCheckStatus({
 *   verbose: true,
 *   include_tasks: true
 * });
 * ```
 */
export const handleCheckStatus: ToolHandler<CheckStatusArgs> = async (
  args: CheckStatusArgs,
  context?: ToolHandlerContext
): Promise<CallToolResult> => {
  try {
    // No validation needed - check-status accepts no arguments
    
    logger.info('Checking system status', {
      sessionId: context?.sessionId
    });
    
    // Initialize status structure
    const status: SystemStatus = {
      claude: createEmptyServiceStatus('Claude Code'),
      gemini: createEmptyServiceStatus('Gemini CLI'),
      overall_status: 'not active',
      file_root: createEmptyFileRootStatus(),
      active_tasks: 0,
      active_sessions: 0,
      daemon_status: {
        reachable: false,
        host: process.env.CLAUDE_PROXY_HOST || process.env.HOST_BRIDGE_DAEMON_HOST || 'host.docker.internal',
        port: parseInt(process.env.CLAUDE_PROXY_PORT || process.env.HOST_BRIDGE_DAEMON_PORT || '9876', 10),
        tools: []
      }
    };
    
    // Check daemon connectivity first
    const daemonStatus = await checkDaemonConnectivity();
    status.daemon_status = {
      ...status.daemon_status,
      ...daemonStatus
    };
    
    // Check tool availability - prefer daemon status over environment
    if (daemonStatus.reachable) {
      status.claude.daemon_reachable = true;
      status.gemini.daemon_reachable = true;
      status.claude.daemon_has_tool = daemonStatus.tools.includes('claude');
      status.gemini.daemon_has_tool = daemonStatus.tools.includes('gemini');
      status.file_root.daemon_accessible = true;
      
      // Use daemon status if available
      status.claude.available = status.claude.daemon_has_tool;
      status.gemini.available = status.gemini.daemon_has_tool;
      
      // Get tool paths from environment
      status.claude.cli_path = process.env.CLAUDE_PATH || null;
      status.gemini.cli_path = process.env.GEMINI_PATH || null;
    } else {
      // Fall back to environment variables
      status.claude.available = isToolAvailable('CLAUDECODE');
      status.gemini.available = isToolAvailable('GEMINICLI');
      status.file_root.daemon_accessible = false;
    }
    
    // Perform detailed checks
    await Promise.all([
      checkClaudeCodeVersion(status.claude),
      checkGeminiCliVersion(status.gemini),
      checkFileRootConfiguration(status.file_root)
    ]);
    
    // Always get active tasks and sessions count
    const tasks = await taskOperations.taskStore.getAllTasks();
    status.active_tasks = tasks.filter((t: any) => 
      t.status === 'pending' || t.status === 'in_progress'
    ).length;
    
    const sessions = agentOperations.agentManager.getAllSessions();
    status.active_sessions = sessions.filter((s: any) => 
      s.status === 'active' || s.status === 'busy'
    ).length;
    
    // Determine overall status based on tool availability only
    const claudeActive = status.claude.available;
    const geminiActive = status.gemini.available;
    
    if (claudeActive && geminiActive) {
      status.overall_status = 'active';
    } else if (claudeActive || geminiActive) {
      status.overall_status = 'partial';
    } else {
      status.overall_status = 'not active';
    }
    
    logger.info('Status check completed', {
      overallStatus: status.overall_status,
      claudeActive,
      geminiActive,
      activeTasks: status.active_tasks,
      activeSessions: status.active_sessions
    });
    
    // Build response
    const response = await buildStatusResponse(status, {
      verbose: false,
      include_tasks: false
    });
    
    return formatToolResponse({
      message: response.message,
      result: response
    });
    
  } catch (error) {
    logger.error('Failed to check status', { error, args });
    
    if (error instanceof StatusCheckError) {
      return formatToolResponse({
        status: 'error',
        message: error.message,
        error: {
          type: 'status_check_error',
          details: error.details
        }
      });
    }
    
    return formatToolResponse({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to check status',
      error: {
        type: 'status_check_error',
        details: error instanceof Error ? error.stack : undefined
      }
    });
  }
};

/**
 * Creates an empty service status object
 */
function createEmptyServiceStatus(cliName: string): ServiceStatus {
  return {
    available: false,
    cli_path: null,
    error: null,
    version: null,
    cli_name: cliName
  };
}

/**
 * Creates an empty file root status object
 */
function createEmptyFileRootStatus(): FileRootStatus {
  return {
    configured: false,
    docker_path: null,
    host_path: null,
    exists: false,
    is_git_repo: false,
    git_available: false,
    writable: false,
    current_branch: null,
    daemon_accessible: false
  };
}

/**
 * Checks daemon connectivity and available tools
 */
async function checkDaemonConnectivity(): Promise<{
  reachable: boolean;
  tools: string[];
  error?: string;
}> {
  const proxyHost = process.env.CLAUDE_PROXY_HOST || process.env.HOST_BRIDGE_DAEMON_HOST || 'host.docker.internal';
  const proxyPort = parseInt(process.env.CLAUDE_PROXY_PORT || process.env.HOST_BRIDGE_DAEMON_PORT || '9876', 10);
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      client.destroy();
      resolve({ reachable: false, tools: [], error: 'Connection timeout' });
    }, 5000);
    
    const client = net.createConnection({ port: proxyPort, host: proxyHost });
    
    client.on('connect', () => {
      clearTimeout(timeout);
      // Send a status request
      const message = JSON.stringify({
        tool: 'status',
        command: 'check'
      });
      client.write(message + '\n');
      
      let responseData = '';
      client.on('data', (data) => {
        responseData += data.toString();
        // Simple check for available tools in response
        if (responseData.includes('Available tools:')) {
          const tools: string[] = [];
          if (responseData.includes('claude')) tools.push('claude');
          if (responseData.includes('gemini')) tools.push('gemini');
          client.destroy();
          resolve({ reachable: true, tools });
        }
      });
      
      // Fallback if no proper response
      setTimeout(() => {
        client.destroy();
        // Assume daemon is reachable but couldn't parse tools
        resolve({ reachable: true, tools: [] });
      }, 2000);
    });
    
    client.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ reachable: false, tools: [], error: error instanceof Error ? error.message : String(error) });
    });
  });
}

/**
 * Checks Claude Code CLI version
 */
async function checkClaudeCodeVersion(claudeStatus: ServiceStatus): Promise<void> {
  try {
    if (!claudeStatus.available && !claudeStatus.daemon_has_tool) {
      claudeStatus.error = 'Claude Code CLI not available';
      return;
    }
    
    // If daemon has the tool, we can try to get version through it
    if (claudeStatus.daemon_reachable && claudeStatus.daemon_has_tool) {
      logger.info('Claude available through daemon');
      claudeStatus.version = 'Available via daemon';
      return;
    }
    
    logger.info('Checking Claude Code version locally');
    const version = execSync('claude --version', { 
      encoding: 'utf-8',
      env: { ...process.env },
      timeout: 30000
    }).trim();
    
    claudeStatus.version = version;
    logger.info('Claude Code version detected', { version });
  } catch (error) {
    claudeStatus.error = 'Failed to get Claude Code version';
    logger.error('Claude Code version check failed', { error });
  }
}

/**
 * Checks Gemini CLI version
 */
async function checkGeminiCliVersion(geminiStatus: ServiceStatus): Promise<void> {
  try {
    if (!geminiStatus.available && !geminiStatus.daemon_has_tool) {
      geminiStatus.error = 'Gemini CLI not available';
      return;
    }
    
    // If daemon has the tool, we can try to get version through it
    if (geminiStatus.daemon_reachable && geminiStatus.daemon_has_tool) {
      logger.info('Gemini available through daemon');
      geminiStatus.version = 'Available via daemon';
      return;
    }
    
    logger.info('Checking Gemini CLI version locally');
    const version = execSync('gemini --version', { 
      encoding: 'utf-8',
      env: { ...process.env },
      timeout: 30000
    }).trim();
    
    geminiStatus.version = version;
    logger.info('Gemini CLI version detected', { version });
  } catch (error) {
    geminiStatus.error = 'Failed to get Gemini CLI version';
    logger.error('Gemini CLI version check failed', { error });
  }
}

/**
 * Checks file root configuration and Git status
 */
async function checkFileRootConfiguration(fileRootStatus: FileRootStatus): Promise<void> {
  // Docker sees /workspace, but the actual host path is different
  const dockerRoot = process.env.FILE_ROOT || process.env.PROJECT_ROOT || '/workspace';
  const hostRoot = process.env.HOST_FILE_ROOT || '/var/www/html/systemprompt-coding-agent';
  
  fileRootStatus.configured = true; // Always configured in Docker
  fileRootStatus.docker_path = dockerRoot;
  fileRootStatus.host_path = hostRoot;
  
  try {
    // Check if Docker directory exists
    if (dockerRoot) {
      try {
        const stat = await fs.stat(dockerRoot);
        fileRootStatus.exists = stat.isDirectory();
        
        // Check write permissions
        try {
          await fs.access(dockerRoot, fs.constants.W_OK);
          fileRootStatus.writable = true;
        } catch {
          fileRootStatus.writable = false;
        }
      } catch {
        fileRootStatus.exists = false;
      }
    }
    
    // Check Git availability
    try {
      execSync('git --version', { encoding: 'utf-8' });
      fileRootStatus.git_available = true;
      
      // Check if it's a Git repository
      if (fileRootStatus.exists && dockerRoot) {
        try {
          const gitDir = path.join(dockerRoot, '.git');
          await fs.stat(gitDir);
          fileRootStatus.is_git_repo = true;
          
          // Get current branch
          try {
            const branch = execSync('git branch --show-current', {
              cwd: dockerRoot,
              encoding: 'utf-8'
            }).trim();
            fileRootStatus.current_branch = branch || 'main';
          } catch {
            // Try to get from environment
            fileRootStatus.current_branch = process.env.GIT_CURRENT_BRANCH || null;
          }
        } catch {
          fileRootStatus.is_git_repo = false;
        }
      }
    } catch {
      fileRootStatus.git_available = false;
    }
  } catch (error) {
    logger.error('Failed to check file root status', { error });
  }
}

/**
 * Builds the status response object
 */
async function buildStatusResponse(
  status: SystemStatus,
  options: { verbose: boolean; include_tasks: boolean }
): Promise<StatusCheckResult> {
  const claudeActive = status.claude.available;
  const geminiActive = status.gemini.available;
  
  const response: StatusCheckResult = {
    message: `System status: ${status.overall_status}`,
    status: status.overall_status,
    services: {
      claude: {
        status: claudeActive ? 'active' : 'not active',
        cli_available: status.claude.available,
        cli_name: status.claude.cli_name
      },
      gemini: {
        status: geminiActive ? 'active' : 'not active',
        cli_available: status.gemini.available,
        cli_name: status.gemini.cli_name
      }
    },
    file_root: status.file_root
  };
  
  // Add task/session counts if available
  if (options.include_tasks) {
    response.active_tasks = status.active_tasks;
    response.active_sessions = status.active_sessions;
  }
  
  // Add verbose details if requested
  if (options.verbose) {
    response.details = {
      claude: status.claude,
      gemini: status.gemini,
      environment: {
        CLAUDE_AVAILABLE: process.env.CLAUDE_AVAILABLE || 'false',
        GEMINI_AVAILABLE: process.env.GEMINI_AVAILABLE || 'false',
        CLAUDE_PATH: status.claude.cli_path || 'NOT SET',
        GEMINI_PATH: status.gemini.cli_path || 'NOT SET',
        HOST_FILE_ROOT: process.env.HOST_FILE_ROOT || 'NOT SET',
        DOCKER_FILE_ROOT: process.env.FILE_ROOT || '/workspace',
        HOST_BRIDGE_DAEMON: `${status.daemon_status.host}:${status.daemon_status.port}`,
        DAEMON_REACHABLE: status.daemon_status.reachable ? 'true' : 'false',
        DAEMON_TOOLS: status.daemon_status.tools.join(', ') || 'none'
      }
    };
    
    // Add task details if requested
    if (options.include_tasks) {
      const tasks = await taskOperations.taskStore.getAllTasks();
      response.details.tasks = tasks
        .filter((t: any) => t.status === 'pending' || t.status === 'in_progress')
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          tool: t.preferred_agent === 'claude' ? 'CLAUDECODE' : 
                t.preferred_agent === 'gemini' ? 'GEMINICLI' : 'AUTO'
        }));
      
      const sessions = agentOperations.agentManager.getAllSessions();
      response.details.sessions = sessions
        .filter((s: any) => s.status === 'active' || s.status === 'busy')
        .map((s: any) => ({
          id: s.id,
          type: s.type,
          status: s.status,
          taskId: s.taskId
        }));
    }
  }
  
  return response;
}