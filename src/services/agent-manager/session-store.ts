/**
 * @file Session storage for Agent Manager
 * @module services/agent-manager/session-store
 */

import { v4 as uuidv4 } from 'uuid';
import type { 
  AgentSession, 
  AgentType, 
  AgentSessionStatus,
  SessionMetrics 
} from './types.js';
import { SESSION_ID_PREFIXES } from './constants.js';
import { SessionNotFoundError } from './errors.js';

export class SessionStore {
  private readonly sessions = new Map<string, AgentSession>();

  /**
   * Creates a new session
   */
  createSession(
    type: AgentType,
    serviceSessionId: string,
    projectPath: string,
    taskId?: string,
    mcpSessionId?: string
  ): AgentSession {
    const sessionId = `${SESSION_ID_PREFIXES[type.toUpperCase() as keyof typeof SESSION_ID_PREFIXES]}${uuidv4()}`;
    
    const session: AgentSession = {
      id: sessionId,
      type,
      serviceSessionId,
      status: 'active',
      projectPath,
      taskId,
      mcpSessionId,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      output_buffer: [],
      error_buffer: []
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Gets a session by ID
   */
  getSession(sessionId: string): AgentSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    return session;
  }

  /**
   * Finds a session by ID
   */
  findSession(sessionId: string): AgentSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Finds a session by service ID
   */
  findSessionByServiceId(serviceSessionId: string): AgentSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.serviceSessionId === serviceSessionId) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Updates session status
   */
  updateStatus(sessionId: string, status: AgentSessionStatus): void {
    const session = this.getSession(sessionId);
    session.status = status;
    session.last_activity = new Date().toISOString();
  }

  /**
   * Updates session activity
   */
  updateActivity(sessionId: string): void {
    const session = this.getSession(sessionId);
    session.last_activity = new Date().toISOString();
  }

  /**
   * Adds output to session buffer
   */
  addOutput(sessionId: string, output: string): void {
    const session = this.getSession(sessionId);
    session.output_buffer.push(output);
    session.last_activity = new Date().toISOString();
  }

  /**
   * Adds error to session buffer
   */
  addError(sessionId: string, error: string): void {
    const session = this.getSession(sessionId);
    session.error_buffer.push(error);
    session.last_activity = new Date().toISOString();
  }

  /**
   * Deletes a session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Gets all sessions
   */
  getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Gets sessions by type
   */
  getSessionsByType(type: AgentType): AgentSession[] {
    return Array.from(this.sessions.values()).filter(s => s.type === type);
  }

  /**
   * Gets session metrics
   */
  getMetrics(): SessionMetrics {
    const sessions = this.getAllSessions();
    
    const sessionsByType = sessions.reduce((acc, session) => {
      acc[session.type] = (acc[session.type] || 0) + 1;
      return acc;
    }, {} as Record<AgentType, number>);

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      busySessions: sessions.filter(s => s.status === 'busy').length,
      errorSessions: sessions.filter(s => s.status === 'error').length,
      sessionsByType
    };
  }
}