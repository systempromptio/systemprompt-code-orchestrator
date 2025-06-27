import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

export interface GeminiSession {
  id: string;
  process: ChildProcess;
  status: 'initializing' | 'ready' | 'busy' | 'error' | 'terminated';
  workingDirectory: string;
  outputBuffer: string[];
  errorBuffer: string[];
  createdAt: Date;
  lastActivity: Date;
}

export interface GeminiOptions {
  apiKey?: string;
  model?: string;
  workingDirectory?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiResponse {
  type: 'message' | 'file_created' | 'file_modified' | 'command_executed' | 'error' | 'thinking';
  content?: string;
  filePath?: string;
  command?: string;
  output?: string;
  error?: string;
}

export class GeminiCliService extends EventEmitter {
  private static instance: GeminiCliService;
  private sessions: Map<string, GeminiSession> = new Map();
  
  private constructor() {
    super();
  }
  
  static getInstance(): GeminiCliService {
    if (!GeminiCliService.instance) {
      GeminiCliService.instance = new GeminiCliService();
    }
    return GeminiCliService.instance;
  }
  
  async createSession(options: GeminiOptions = {}): Promise<string> {
    const sessionId = `gemini_${uuidv4()}`;
    const workingDirectory = options.workingDirectory || process.cwd();
    
    // For simplified version, create mock process
    const geminiProcess = spawn('echo', ['Gemini CLI session'], {
      cwd: workingDirectory,
      shell: true
    });
    
    const session: GeminiSession = {
      id: sessionId,
      process: geminiProcess,
      status: 'initializing',
      workingDirectory,
      outputBuffer: [],
      errorBuffer: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    // Simulate initialization
    setTimeout(() => {
      session.status = 'ready';
      this.emit('session:ready', { sessionId });
    }, 100);
    
    this.sessions.set(sessionId, session);
    this.emit('session:created', { sessionId });
    
    return sessionId;
  }
  
  async sendPrompt(sessionId: string, prompt: string): Promise<GeminiResponse[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    if (session.status !== 'ready') {
      throw new Error(`Session ${sessionId} is ${session.status}`);
    }
    
    session.status = 'busy';
    session.lastActivity = new Date();
    
    // Simulate response
    const responses: GeminiResponse[] = [
      {
        type: 'thinking',
        content: 'Processing request...'
      },
      {
        type: 'message',
        content: `Executing: ${prompt}`
      }
    ];
    
    session.outputBuffer.push(`Prompt: ${prompt}`);
    session.status = 'ready';
    
    return responses;
  }
  
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.process.kill('SIGTERM');
    session.status = 'terminated';
    this.sessions.delete(sessionId);
    this.emit('session:terminated', { sessionId });
  }
  
  getSession(sessionId: string): GeminiSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  getAllSessions(): GeminiSession[] {
    return Array.from(this.sessions.values());
  }
  
  async getSessionOutput(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    return session.outputBuffer.join('');
  }
  
  async getSessionErrors(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    return session.errorBuffer.join('');
  }
}