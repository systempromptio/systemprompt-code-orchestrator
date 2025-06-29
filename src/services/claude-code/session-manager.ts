/**
 * @file Session management for Claude Code service
 * @module services/claude-code/session-manager
 */

import { v4 as uuidv4 } from 'uuid';
import type { ClaudeCodeSession, ClaudeCodeOptions, SessionStatus } from './types.js';
import { SessionNotFoundError } from './errors.js';
import { SESSION_ID_PREFIX } from './constants.js';
import { logger } from '../../utils/logger.js';

export class SessionManager {
  private readonly sessions = new Map<string, ClaudeCodeSession>();

  /**
   * Creates a new session
   */
  createSession(options: ClaudeCodeOptions = {}): ClaudeCodeSession {
    const sessionId = `${SESSION_ID_PREFIX}${uuidv4()}`;
    
    const session: ClaudeCodeSession = {
      id: sessionId,
      status: 'ready',
      workingDirectory: options.workingDirectory || process.cwd(),
      options,
      outputBuffer: [],
      errorBuffer: [],
      streamBuffer: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };

    logger.info('Creating Claude session', {
      sessionId,
      workingDirectory: session.workingDirectory,
      options
    });

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Gets a session by ID
   */
  getSession(sessionId: string): ClaudeCodeSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    return session;
  }

  /**
   * Gets a session if it exists
   */
  findSession(sessionId: string): ClaudeCodeSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Updates session status
   */
  updateStatus(sessionId: string, status: SessionStatus): void {
    const session = this.getSession(sessionId);
    session.status = status;
    session.lastActivity = new Date();
  }

  /**
   * Updates session activity
   */
  updateActivity(sessionId: string): void {
    const session = this.getSession(sessionId);
    session.lastActivity = new Date();
  }

  /**
   * Sets task ID for a session
   */
  setTaskId(sessionId: string, taskId: string): void {
    const session = this.getSession(sessionId);
    session.taskId = taskId;
    logger.info('Linked session to task', { sessionId, taskId });
  }

  /**
   * Sets MCP session ID for a session
   */
  setMcpSessionId(sessionId: string, mcpSessionId: string): void {
    const session = this.getSession(sessionId);
    session.mcpSessionId = mcpSessionId;
    logger.info('Linked session to MCP session', { sessionId, mcpSessionId });
  }

  /**
   * Ends a session
   */
  endSession(sessionId: string): void {
    const session = this.findSession(sessionId);
    if (!session) return;

    if (session.abortController) {
      session.abortController.abort();
    }

    session.status = 'terminated';
    this.sessions.delete(sessionId);
    logger.info('Session terminated', { sessionId });
  }

  /**
   * Gets all sessions
   */
  getAllSessions(): ClaudeCodeSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Gets session metrics
   */
  getMetrics() {
    const sessions = this.getAllSessions();
    const activeSessions = sessions.filter(s => s.status === 'ready' || s.status === 'busy');
    const errorSessions = sessions.filter(s => s.status === 'error');

    const durations = sessions
      .filter(s => s.status === 'terminated')
      .map(s => s.lastActivity.getTime() - s.createdAt.getTime());

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      errorSessions: errorSessions.length,
      averageSessionDuration: durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0
    };
  }

  /**
   * Cleans up old sessions
   */
  cleanupOldSessions(maxAgeMs: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > maxAgeMs) {
        this.endSession(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up old sessions', { count: cleaned });
    }

    return cleaned;
  }
}