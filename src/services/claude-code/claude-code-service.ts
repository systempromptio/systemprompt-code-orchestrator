/**
 * @file Modern Claude Code service implementation
 * @module services/claude-code/claude-code-service
 */

import { EventEmitter } from 'events';
import type { 
  ClaudeCodeSession, 
  ClaudeCodeOptions, 
  ProgressEvent,
  StreamEvent 
} from './types.js';
import { SessionNotReadyError } from './errors.js';
import { ENV_VARS } from './constants.js';
import { SessionManager } from './session-manager.js';
import { HostProxyClient } from './host-proxy-client.js';
import { QueryExecutor } from './query-executor.js';
import { ProgressTracker } from './progress-tracker.js';
import { logger } from '../../utils/logger.js';

export interface ClaudeCodeServiceEvents {
  'session:created': { sessionId: string };
  'session:ready': { sessionId: string };
  'session:terminated': { sessionId: string };
  'task:progress': ProgressEvent;
  'stream:data': StreamEvent;
}

export class ClaudeCodeService extends EventEmitter {
  private static instance: ClaudeCodeService;
  private readonly sessionManager: SessionManager;
  private readonly hostProxyClient: HostProxyClient;
  private readonly queryExecutor: QueryExecutor;
  private progressTracker?: ProgressTracker;
  private readonly useHostProxy: boolean;

  private constructor() {
    super();
    this.sessionManager = new SessionManager();
    this.hostProxyClient = new HostProxyClient();
    this.queryExecutor = new QueryExecutor();
    
    // Check if we should use host proxy
    this.useHostProxy = !process.env[ENV_VARS.ANTHROPIC_API_KEY];
    
    logger.info('Claude Code service initialized', { 
      useHostProxy: this.useHostProxy 
    });
  }

  static getInstance(): ClaudeCodeService {
    if (!ClaudeCodeService.instance) {
      ClaudeCodeService.instance = new ClaudeCodeService();
    }
    return ClaudeCodeService.instance;
  }

  /**
   * Gets or creates the progress tracker
   */
  private async getProgressTracker(): Promise<ProgressTracker> {
    if (!this.progressTracker) {
      const { TaskStore } = await import('../task-store.js');
      this.progressTracker = new ProgressTracker(TaskStore.getInstance());
    }
    return this.progressTracker;
  }

  /**
   * Creates a new session
   */
  async createSession(options: ClaudeCodeOptions = {}): Promise<string> {
    const session = this.sessionManager.createSession(options);
    
    this.emit('session:created', { sessionId: session.id });
    this.emit('session:ready', { sessionId: session.id });
    
    return session.id;
  }

  /**
   * Sets task ID for a session
   */
  setTaskId(sessionId: string, taskId: string): void {
    this.sessionManager.setTaskId(sessionId, taskId);
  }

  /**
   * Sets MCP session ID for a session
   */
  setMcpSessionId(sessionId: string, mcpSessionId: string): void {
    this.sessionManager.setMcpSessionId(sessionId, mcpSessionId);
  }

  /**
   * Finds a session by ID
   */
  findSession(sessionId: string): ClaudeCodeSession | undefined {
    return this.sessionManager.findSession(sessionId);
  }

  /**
   * Executes a query synchronously
   */
  async querySync(
    sessionId: string, 
    prompt: string, 
    options?: Partial<ClaudeCodeOptions>
  ): Promise<string> {
    const session = this.sessionManager.getSession(sessionId);
    
    logger.info('Query requested', {
      sessionId,
      status: session.status,
      promptLength: prompt.length,
      workingDirectory: session.workingDirectory,
      useHostProxy: this.useHostProxy
    });

    if (session.status !== 'ready' && session.status !== 'busy') {
      throw new SessionNotReadyError(sessionId, session.status);
    }

    this.sessionManager.updateStatus(sessionId, 'busy');

    try {
      let result: string;

      if (this.useHostProxy) {
        result = await this.executeViaHostProxy(session, prompt);
      } else {
        const queryResult = await this.queryExecutor.execute(session, prompt, options);
        result = queryResult.content;
        
        // Handle progress tracking for SDK messages
        if (session.taskId) {
          const tracker = await this.getProgressTracker();
          for (const message of queryResult.messages) {
            if (message.type === 'assistant' && message.message?.content) {
              await tracker.logAssistantMessage(session.taskId, message.message.content, session.mcpSessionId);
            }
          }
        }
      }

      this.sessionManager.updateStatus(sessionId, 'ready');
      return result;
    } catch (error) {
      this.sessionManager.updateStatus(sessionId, 'error');
      session.errorBuffer.push(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Executes via host proxy
   */
  private async executeViaHostProxy(
    session: ClaudeCodeSession, 
    prompt: string
  ): Promise<string> {
    const tracker = await this.getProgressTracker();

    const result = await this.hostProxyClient.execute(
      prompt,
      session.workingDirectory,
      async (data: string) => {
        // Handle streaming data
        session.streamBuffer.push(data);
        
        this.emit('stream:data', {
          sessionId: session.id,
          data,
          taskId: session.taskId
        });

        // Parse progress if task is linked
        if (session.taskId) {
          await tracker.parseProgressFromStream(session, data);
        }
      }
    );

    // Store result in output buffer
    session.outputBuffer.push({
      type: 'assistant',
      message: { content: [{ type: 'text', text: result }] }
    } as any);

    return result;
  }

  /**
   * Ends a session
   */
  async endSession(sessionId: string): Promise<void> {
    this.sessionManager.endSession(sessionId);
    this.emit('session:terminated', { sessionId });
  }

  /**
   * Gets a session
   */
  getSession(sessionId: string): ClaudeCodeSession | undefined {
    return this.sessionManager.findSession(sessionId);
  }

  /**
   * Gets all sessions
   */
  getAllSessions(): ClaudeCodeSession[] {
    return this.sessionManager.getAllSessions();
  }

  /**
   * Gets service metrics
   */
  getMetrics() {
    return this.sessionManager.getMetrics();
  }

  /**
   * Cleans up old sessions
   */
  cleanupOldSessions(maxAgeMs?: number): number {
    return this.sessionManager.cleanupOldSessions(maxAgeMs);
  }

  // Type-safe event emitter methods
  emit<K extends keyof ClaudeCodeServiceEvents>(
    event: K,
    ...args: ClaudeCodeServiceEvents[K] extends void ? [] : [ClaudeCodeServiceEvents[K]]
  ): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof ClaudeCodeServiceEvents>(
    event: K,
    listener: (arg: ClaudeCodeServiceEvents[K]) => void
  ): this {
    return super.on(event, listener);
  }

  off<K extends keyof ClaudeCodeServiceEvents>(
    event: K,
    listener: (arg: ClaudeCodeServiceEvents[K]) => void
  ): this {
    return super.off(event, listener);
  }
}