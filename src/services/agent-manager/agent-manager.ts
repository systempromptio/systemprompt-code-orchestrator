/**
 * @file Modern Agent Manager implementation
 * @module services/agent-manager/agent-manager
 */

import { EventEmitter } from 'events';
import type {
  AgentSession,
  AgentCommand,
  AgentCommandResult,
  ClaudeSessionConfig,
  GeminiSessionConfig,
  SessionEvent,
  TaskProgressEvent,
  AgentType
} from './types.js';
import { 
  SessionNotFoundError, 
  UnknownSessionTypeError 
} from './errors.js';
import { ERROR_CODES } from './constants.js';
import { SessionStore } from './session-store.js';
import { TaskLogger } from './task-logger.js';
import { ClaudeSessionManager } from './claude-session-manager.js';
import { GeminiSessionManager } from './gemini-session-manager.js';
import { logger } from '../../utils/logger.js';

export interface AgentManagerEvents {
  'session:created': SessionEvent;
  'session:ready': string;
  'task:progress': TaskProgressEvent;
}

export class AgentManager extends EventEmitter {
  private static instance: AgentManager;
  private readonly sessionStore: SessionStore;
  private taskLogger!: TaskLogger;
  private claudeManager!: ClaudeSessionManager;
  private geminiManager!: GeminiSessionManager;

  private constructor() {
    super();
    
    this.sessionStore = new SessionStore();
    
    // Lazy load dependencies
    const getTaskStore = async () => {
      const { TaskStore } = await import('../task-store.js');
      return TaskStore.getInstance();
    };

    const getClaudeService = async () => {
      const { ClaudeCodeService } = await import('../claude-code/index.js');
      return ClaudeCodeService.getInstance();
    };

    const getGeminiService = async () => {
      const { GeminiCliService } = await import('../gemini-cli-service.js');
      return GeminiCliService.getInstance();
    };

    // Initialize managers with lazy-loaded dependencies
    Promise.all([getTaskStore(), getClaudeService(), getGeminiService()]).then(
      ([taskStore, claudeService, geminiService]) => {
        this.taskLogger = new TaskLogger(taskStore);
        
        this.claudeManager = new ClaudeSessionManager(
          claudeService,
          this.sessionStore,
          this.taskLogger
        );

        this.geminiManager = new GeminiSessionManager(
          geminiService,
          this.sessionStore,
          this.taskLogger
        );

        this.setupServiceListeners();
      }
    );
  }

  static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  /**
   * Sets up service event listeners
   */
  private setupServiceListeners(): void {
    // Handle session ready events
    const handleSessionReady = (serviceSessionId: string) => {
      const session = this.sessionStore.findSessionByServiceId(serviceSessionId);
      if (session) {
        this.sessionStore.updateStatus(session.id, 'active');
        this.emit('session:ready', session.id);
      }
    };

    this.claudeManager.setupEventListeners(handleSessionReady);
    this.geminiManager.setupEventListeners(handleSessionReady);

    // Handle Claude task progress events
    import('../claude-code/index.js').then(({ ClaudeCodeService }) => {
      const claudeService = ClaudeCodeService.getInstance();
      claudeService.on('task:progress', (progress: TaskProgressEvent) => {
        this.emit('task:progress', progress);
        
        // Update session activity
        const sessions = this.sessionStore.getAllSessions();
        const session = sessions.find(s => s.taskId === progress.taskId);
        if (session) {
          this.sessionStore.updateActivity(session.id);
        }
      });
    });
  }

  /**
   * Starts a Claude session
   */
  async startClaudeSession(config: ClaudeSessionConfig): Promise<string> {
    const sessionId = await this.claudeManager.startSession(config);
    
    this.emit('session:created', { 
      sessionId, 
      type: 'claude' 
    });

    logger.info('Claude agent session created', {
      sessionId,
      projectPath: config.project_path,
      taskId: config.task_id
    });

    return sessionId;
  }

  /**
   * Starts a Gemini session
   */
  async startGeminiSession(config: GeminiSessionConfig): Promise<string> {
    const sessionId = await this.geminiManager.startSession(config);
    
    this.emit('session:created', { 
      sessionId, 
      type: 'gemini' 
    });

    logger.info('Gemini agent session created', {
      sessionId,
      projectPath: config.project_path,
      taskId: config.task_id
    });

    return sessionId;
  }

  /**
   * Sends a command to an agent
   */
  async sendCommand(
    sessionId: string, 
    command: AgentCommand
  ): Promise<AgentCommandResult> {
    const session = this.sessionStore.findSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    if (session.status !== 'active') {
      return {
        success: false,
        error: {
          code: ERROR_CODES.SESSION_NOT_ACTIVE,
          message: `Session is ${session.status}`,
          retryable: false
        },
        duration: 0
      };
    }

    this.sessionStore.updateStatus(sessionId, 'busy');

    try {
      let result: AgentCommandResult;

      switch (session.type) {
        case 'claude':
          result = await this.claudeManager.sendCommand(
            session, 
            command.command, 
            command.timeout
          );
          break;

        case 'gemini':
          result = await this.geminiManager.sendCommand(
            session, 
            command.command
          );
          break;

        default:
          throw new UnknownSessionTypeError(session.type);
      }

      this.sessionStore.updateStatus(sessionId, 'active');
      return result;

    } catch (error) {
      this.sessionStore.updateStatus(sessionId, 'active');
      throw error;
    }
  }

  /**
   * Ends an agent session
   */
  async endSession(sessionId: string): Promise<boolean> {
    const session = this.sessionStore.findSession(sessionId);
    if (!session) return false;

    try {
      // Log session ending
      if (session.taskId) {
        await this.taskLogger.logError(
          session.taskId,
          '[SESSION_ENDING]',
          `Terminating ${session.type} session: ${sessionId}`
        );
      }

      // End the appropriate service session
      switch (session.type) {
        case 'claude':
          await this.claudeManager.endSession(session);
          break;

        case 'gemini':
          await this.geminiManager.endSession(session);
          break;

        default:
          throw new UnknownSessionTypeError(session.type);
      }

      this.sessionStore.updateStatus(sessionId, 'terminated');
      this.sessionStore.deleteSession(sessionId);

      logger.info('Agent session ended', {
        sessionId,
        type: session.type
      });

      return true;
    } catch (error) {
      logger.error('Error ending session', {
        sessionId,
        type: session.type,
        error
      });
      return false;
    }
  }

  /**
   * Gets a session by ID
   */
  getSession(sessionId: string): AgentSession | null {
    return this.sessionStore.findSession(sessionId);
  }

  /**
   * Gets all sessions
   */
  getAllSessions(): AgentSession[] {
    return this.sessionStore.getAllSessions();
  }

  /**
   * Gets sessions by type
   */
  getSessionsByType(type: AgentType): AgentSession[] {
    return this.sessionStore.getSessionsByType(type);
  }

  /**
   * Gets session metrics
   */
  getMetrics() {
    return this.sessionStore.getMetrics();
  }

  // Type-safe event emitter methods
  emit<K extends keyof AgentManagerEvents>(
    event: K,
    ...args: AgentManagerEvents[K] extends void ? [] : [AgentManagerEvents[K]]
  ): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof AgentManagerEvents>(
    event: K,
    listener: (arg: AgentManagerEvents[K]) => void
  ): this {
    return super.on(event, listener);
  }

  off<K extends keyof AgentManagerEvents>(
    event: K,
    listener: (arg: AgentManagerEvents[K]) => void
  ): this {
    return super.off(event, listener);
  }
}