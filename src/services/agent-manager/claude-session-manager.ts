/**
 * @file Claude session management for Agent Manager
 * @module services/agent-manager/claude-session-manager
 */

import type { ClaudeSessionConfig, AgentSession, AgentCommandResult } from './types.js';
import type { ClaudeCodeService, ClaudeCodeOptions } from '../claude-code/index.js';
import type { SessionStore } from './session-store.js';
import type { TaskLogger } from './task-logger.js';
import { DEFAULT_MAX_TURNS } from './constants.js';
import { logger } from '../../utils/logger.js';

export class ClaudeSessionManager {
  constructor(
    private readonly claudeService: ClaudeCodeService,
    private readonly sessionStore: SessionStore,
    private readonly taskLogger: TaskLogger
  ) {}

  /**
   * Starts a Claude session
   */
  async startSession(config: ClaudeSessionConfig): Promise<string> {
    const claudeOptions: ClaudeCodeOptions = {
      workingDirectory: config.project_path,
      customSystemPrompt: config.initial_context,
      ...config.options
    };

    // Create Claude service session
    const serviceSessionId = await this.claudeService.createSession(claudeOptions);

    // Link with task if provided
    if (config.task_id) {
      this.claudeService.setTaskId(serviceSessionId, config.task_id);
    }

    // Link with MCP session if provided
    if (config.mcp_session_id) {
      this.claudeService.setMcpSessionId(serviceSessionId, config.mcp_session_id);
    }

    // Create agent session
    const session = this.sessionStore.createSession(
      'claude',
      serviceSessionId,
      config.project_path,
      config.task_id,
      config.mcp_session_id
    );

    // Log session creation
    if (config.task_id) {
      await this.taskLogger.logSessionCreated(
        config.task_id,
        session.id,
        'Claude Code',
        config.project_path,
        config.initial_context,
        config.mcp_session_id
      );
    }

    logger.info('Claude session started', {
      sessionId: session.id,
      serviceSessionId,
      projectPath: config.project_path,
      taskId: config.task_id
    });

    return session.id;
  }

  /**
   * Sends a command to Claude
   */
  async sendCommand(
    session: AgentSession,
    command: string,
    timeout?: number
  ): Promise<AgentCommandResult> {
    const startTime = Date.now();

    try {
      // Log command
      if (session.taskId) {
        await this.taskLogger.logCommandSent(session.taskId, command, session.mcpSessionId);
      }

      // Execute command
      const output = await this.claudeService.querySync(
        session.serviceSessionId,
        command,
        { maxTurns: DEFAULT_MAX_TURNS, timeout }
      );

      const duration = Date.now() - startTime;
      this.sessionStore.addOutput(session.id, output);

      // Log response
      if (session.taskId) {
        await this.taskLogger.logResponseReceived(
          session.taskId,
          duration,
          output.length,
          output,
          session.mcpSessionId
        );
      }

      return {
        success: true,
        output,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.sessionStore.addError(session.id, errorMessage);

      // Log error
      if (session.taskId) {
        await this.taskLogger.logError(
          session.taskId,
          '[COMMAND_ERROR]',
          error,
          session.mcpSessionId
        );
      }

      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }

  /**
   * Ends a Claude session
   */
  async endSession(session: AgentSession): Promise<void> {
    try {
      await this.claudeService.endSession(session.serviceSessionId);
      
      if (session.taskId) {
        await this.taskLogger.logSessionTermination(
          session.taskId,
          session.id,
          'Claude',
          true,
          session.mcpSessionId
        );
      }
    } catch (error) {
      logger.error('Error ending Claude session', { 
        sessionId: session.id,
        error 
      });

      if (session.taskId) {
        await this.taskLogger.logSessionTermination(
          session.taskId,
          session.id,
          'Claude',
          false
        );
      }

      throw error;
    }
  }

  /**
   * Sets up event listeners
   */
  setupEventListeners(onSessionReady: (serviceSessionId: string) => void): void {
    this.claudeService.on('session:ready', ({ sessionId }) => {
      onSessionReady(sessionId);
    });
  }
}