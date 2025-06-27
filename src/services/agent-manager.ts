import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { ClaudeCodeService, ClaudeCodeOptions } from './claude-code-service.js';
import { GeminiCliService, GeminiOptions } from './gemini-cli-service.js';

export interface AgentSession {
  id: string;
  type: 'claude' | 'gemini';
  serviceSessionId: string;
  status: 'starting' | 'active' | 'busy' | 'error' | 'terminated';
  projectPath: string;
  taskId?: string;
  created_at: string;
  last_activity: string;
  output_buffer: string[];
  error_buffer: string[];
}

export interface AgentCommand {
  command: string;
  timeout?: number;
}

export class AgentManager extends EventEmitter {
  private static instance: AgentManager;
  private sessions: Map<string, AgentSession> = new Map();
  private claudeService: ClaudeCodeService;
  private geminiService: GeminiCliService;
  
  private constructor() {
    super();
    this.claudeService = ClaudeCodeService.getInstance();
    this.geminiService = GeminiCliService.getInstance();
    
    // Forward service events
    this.setupServiceListeners();
  }
  
  static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }
  
  private setupServiceListeners(): void {
    // Claude service events
    this.claudeService.on('session:ready', ({ sessionId }) => {
      const agentSession = this.findSessionByServiceId(sessionId);
      if (agentSession) {
        agentSession.status = 'active';
        agentSession.last_activity = new Date().toISOString();
        this.emit('session:ready', agentSession.id);
      }
    });
    
    // Gemini service events
    this.geminiService.on('session:ready', ({ sessionId }) => {
      const agentSession = this.findSessionByServiceId(sessionId);
      if (agentSession) {
        agentSession.status = 'active';
        agentSession.last_activity = new Date().toISOString();
        this.emit('session:ready', agentSession.id);
      }
    });
  }
  
  private findSessionByServiceId(serviceSessionId: string): AgentSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.serviceSessionId === serviceSessionId) {
        return session;
      }
    }
    return undefined;
  }
  
  async startClaudeSession(config: {
    project_path: string;
    task_id?: string;
    mode?: 'interactive' | 'batch' | 'review';
    environment_variables?: Record<string, string>;
    initial_context?: string;
    options?: ClaudeCodeOptions;
  }): Promise<string> {
    const sessionId = `agent_claude_${uuidv4()}`;
    
    // Create Claude service session
    const claudeOptions: ClaudeCodeOptions = {
      workingDirectory: config.project_path,
      customSystemPrompt: config.initial_context,
      ...config.options
    };
    
    const serviceSessionId = await this.claudeService.createSession(claudeOptions);
    
    // Link the Claude session with the task
    if (config.task_id) {
      this.claudeService.setTaskId(serviceSessionId, config.task_id);
    }
    
    const session: AgentSession = {
      id: sessionId,
      type: 'claude',
      serviceSessionId,
      status: 'active', // Claude Code SDK sessions are ready immediately
      projectPath: config.project_path,
      taskId: config.task_id,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      output_buffer: [],
      error_buffer: []
    };
    
    this.sessions.set(sessionId, session);
    this.emit('session:created', { sessionId, type: 'claude' });
    
    // Listen for task progress events
    this.claudeService.on('task:progress', (progress) => {
      if (progress.taskId === config.task_id) {
        this.emit('task:progress', progress);
        session.last_activity = new Date().toISOString();
      }
    });
    
    return sessionId;
  }
  
  async startGeminiSession(config: {
    project_path: string;
    task_id?: string;
    model?: string;
    environment_variables?: Record<string, string>;
    options?: GeminiOptions;
  }): Promise<string> {
    const sessionId = `agent_gemini_${uuidv4()}`;
    
    // Create Gemini service session
    const geminiOptions: GeminiOptions = {
      workingDirectory: config.project_path,
      model: config.model,
      ...config.options
    };
    
    const serviceSessionId = await this.geminiService.createSession(geminiOptions);
    
    const session: AgentSession = {
      id: sessionId,
      type: 'gemini',
      serviceSessionId,
      status: 'active', // Gemini sessions are ready immediately
      projectPath: config.project_path,
      taskId: config.task_id,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      output_buffer: [],
      error_buffer: []
    };
    
    // Listen for Gemini responses
    this.geminiService.on('response', ({ sessionId: sId, response }) => {
      if (sId === serviceSessionId) {
        if (response.content) {
          session.output_buffer.push(response.content);
          session.last_activity = new Date().toISOString();
        }
      }
    });
    
    this.sessions.set(sessionId, session);
    this.emit('session:created', session);
    
    return sessionId;
  }
  
  async sendCommand(sessionId: string, command: AgentCommand): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    if (session.status !== 'active') {
      return {
        success: false,
        error: {
          code: 'SESSION_NOT_ACTIVE',
          message: `Session is ${session.status}`,
          retryable: false
        },
        duration: 0
      };
    }
    
    session.status = 'busy';
    session.last_activity = new Date().toISOString();
    
    try {
      if (session.type === 'claude') {
        // Use Claude service
        const output = await this.claudeService.querySync(
          session.serviceSessionId, 
          command.command,
          { maxTurns: 1 }
        );
        
        session.output_buffer.push(output);
        session.status = 'active';
        
        return {
          success: true,
          output
        };
        
      } else if (session.type === 'gemini') {
        // Use Gemini service
        const responses: string[] = [];
        
        const geminiResponses = await this.geminiService.sendPrompt(
          session.serviceSessionId,
          command.command
        );
        
        for (const response of geminiResponses) {
          if (response.content) {
            responses.push(response.content);
          }
          if (response.error) {
            session.status = 'active';
            return {
              success: false,
              error: response.error
            };
          }
        }
        
        const output = responses.join('\n');
        session.output_buffer.push(output);
        session.status = 'active';
        
        return {
          success: true,
          output
        };
      }
      
      return { success: false, error: 'Unknown session type' };
      
    } catch (error) {
      session.status = 'active';
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Command failed'
      };
    }
  }
  
  async endSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    try {
      if (session.type === 'claude') {
        await this.claudeService.endSession(session.serviceSessionId);
      } else if (session.type === 'gemini') {
        await this.geminiService.endSession(session.serviceSessionId);
      }
      
      session.status = 'terminated';
      this.sessions.delete(sessionId);
      
      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  }
  
  getSession(sessionId: string): AgentSession | null {
    return this.sessions.get(sessionId) || null;
  }
  
  getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }
  
  getSessionsByType(type: 'claude' | 'gemini'): AgentSession[] {
    return Array.from(this.sessions.values()).filter(s => s.type === type);
  }
}