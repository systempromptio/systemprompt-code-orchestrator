/**
 * @file Gemini session management for Agent Manager
 * @module services/agent-manager/gemini-session-manager
 */

import type { GeminiSessionConfig, AgentSession, AgentCommandResult } from './types.js';
import type { GeminiCliService, GeminiOptions } from '../gemini-cli-service.js';
import type { SessionStore } from './session-store.js';
import type { TaskLogger } from './task-logger.js';
import { LOG_PREFIXES } from './constants.js';
import { logger } from '../../utils/logger.js';

export class GeminiSessionManager {
  constructor(
    private readonly geminiService: GeminiCliService,
    private readonly sessionStore: SessionStore,
    private readonly taskLogger: TaskLogger
  ) {}

  /**
   * Starts a Gemini session
   */
  async startSession(config: GeminiSessionConfig): Promise<string> {
    const geminiOptions: GeminiOptions = {
      workingDirectory: config.project_path,
      model: config.model,
      ...config.options
    };

    // Create Gemini service session
    const serviceSessionId = await this.geminiService.createSession(geminiOptions);

    // Create agent session
    const session = this.sessionStore.createSession(
      'gemini',
      serviceSessionId,
      config.project_path,
      config.task_id
    );

    // Set up response listener
    this.setupResponseListener(serviceSessionId, session.id);

    // Log session creation
    if (config.task_id) {
      await this.taskLogger.logSessionCreated(
        config.task_id,
        session.id,
        'Gemini',
        config.project_path
      );
    }

    logger.info('Gemini session started', {
      sessionId: session.id,
      serviceSessionId,
      projectPath: config.project_path,
      taskId: config.task_id
    });

    return session.id;
  }

  /**
   * Sends a command to Gemini
   */
  async sendCommand(
    session: AgentSession,
    command: string
  ): Promise<AgentCommandResult> {
    const startTime = Date.now();

    try {
      // Log command
      if (session.taskId) {
        await this.taskLogger.logCommandSent(session.taskId, command);
      }

      // Execute command
      const responses: string[] = [];
      const geminiResponses = await this.geminiService.sendPrompt(
        session.serviceSessionId,
        command
      );

      for (const response of geminiResponses) {
        if (response.content) {
          responses.push(response.content);
        }
        if (response.error) {
          const duration = Date.now() - startTime;
          
          // Log error
          if (session.taskId) {
            await this.taskLogger.logError(
              session.taskId,
              LOG_PREFIXES.GEMINI_ERROR,
              response.error
            );
          }

          return {
            success: false,
            error: response.error,
            duration
          };
        }
      }

      const output = responses.join('\n');
      const duration = Date.now() - startTime;
      
      this.sessionStore.addOutput(session.id, output);

      // Log response
      if (session.taskId) {
        await this.taskLogger.logGeminiResponse(
          session.taskId,
          duration,
          responses.length
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
          LOG_PREFIXES.COMMAND_ERROR,
          error
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
   * Ends a Gemini session
   */
  async endSession(session: AgentSession): Promise<void> {
    try {
      await this.geminiService.endSession(session.serviceSessionId);
      
      if (session.taskId) {
        await this.taskLogger.logSessionTermination(
          session.taskId,
          session.id,
          'Gemini',
          true
        );
      }
    } catch (error) {
      logger.error('Error ending Gemini session', { 
        sessionId: session.id,
        error 
      });

      if (session.taskId) {
        await this.taskLogger.logSessionTermination(
          session.taskId,
          session.id,
          'Gemini',
          false
        );
      }

      throw error;
    }
  }

  /**
   * Sets up response listener for a session
   */
  private setupResponseListener(serviceSessionId: string, agentSessionId: string): void {
    this.geminiService.on('response', ({ sessionId, response }) => {
      if (sessionId === serviceSessionId && response.content) {
        this.sessionStore.addOutput(agentSessionId, response.content);
      }
    });
  }

  /**
   * Sets up event listeners
   */
  setupEventListeners(onSessionReady: (serviceSessionId: string) => void): void {
    this.geminiService.on('session:ready', ({ sessionId }) => {
      onSessionReady(sessionId);
    });
  }
}