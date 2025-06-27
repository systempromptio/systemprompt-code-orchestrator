import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

export interface ClaudeHostSession {
  id: string;
  status: 'ready' | 'busy' | 'error' | 'terminated';
  workingDirectory: string;
  outputBuffer: string[];
  errorBuffer: string[];
  createdAt: Date;
  lastActivity: Date;
}

export interface ClaudeHostOptions {
  workingDirectory?: string;
  timeout?: number;
}

/**
 * Service to execute Claude Code on the host system
 * This runs claude CLI directly on the host, bypassing authentication issues
 */
export class ClaudeCodeHostExecutor extends EventEmitter {
  private static instance: ClaudeCodeHostExecutor;
  private sessions: Map<string, ClaudeHostSession> = new Map();
  
  private constructor() {
    super();
  }
  
  static getInstance(): ClaudeCodeHostExecutor {
    if (!ClaudeCodeHostExecutor.instance) {
      ClaudeCodeHostExecutor.instance = new ClaudeCodeHostExecutor();
    }
    return ClaudeCodeHostExecutor.instance;
  }
  
  async createSession(options: ClaudeHostOptions = {}): Promise<string> {
    const sessionId = `claude_host_${uuidv4()}`;
    const session: ClaudeHostSession = {
      id: sessionId,
      status: 'ready',
      workingDirectory: options.workingDirectory || process.cwd(),
      outputBuffer: [],
      errorBuffer: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    console.log('[ClaudeHostExecutor] Creating session:', {
      sessionId,
      workingDirectory: session.workingDirectory
    });
    
    this.sessions.set(sessionId, session);
    this.emit('session:created', { sessionId });
    
    return sessionId;
  }
  
  async executeCommand(sessionId: string, command: string, options?: Partial<ClaudeHostOptions>): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    if (session.status !== 'ready') {
      throw new Error(`Session ${sessionId} is ${session.status}`);
    }
    
    session.status = 'busy';
    session.lastActivity = new Date();
    
    console.log('[ClaudeHostExecutor] Executing command:', {
      sessionId,
      command: command.substring(0, 100),
      workingDirectory: session.workingDirectory
    });
    
    return new Promise((resolve, reject) => {
      const timeout = options?.timeout || 30000;
      let output = '';
      let error = '';
      let timedOut = false;
      
      // Execute claude on the host via docker exec to host
      // Since we're in Docker, we'll use a mounted script to execute on host
      const claudeProcess = spawn('sh', ['-c', `cd "${session.workingDirectory}" && /workspace/scripts/host-claude.sh "${command}"`]);
      
      const timeoutId = setTimeout(() => {
        timedOut = true;
        claudeProcess.kill();
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);
      
      claudeProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        session.outputBuffer.push(chunk);
        session.lastActivity = new Date();
      });
      
      claudeProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        error += chunk;
        session.errorBuffer.push(chunk);
      });
      
      claudeProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        
        if (timedOut) {
          return;
        }
        
        session.status = 'ready';
        
        if (code !== 0) {
          console.error('[ClaudeHostExecutor] Command failed:', {
            sessionId,
            code,
            error
          });
          session.status = 'error';
          reject(new Error(`Claude process exited with code ${code}: ${error}`));
        } else {
          console.log('[ClaudeHostExecutor] Command succeeded:', {
            sessionId,
            outputLength: output.length
          });
          resolve(output);
        }
      });
      
      claudeProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        session.status = 'error';
        console.error('[ClaudeHostExecutor] Process error:', err);
        reject(err);
      });
    });
  }
  
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.status = 'terminated';
    this.sessions.delete(sessionId);
    this.emit('session:terminated', { sessionId });
  }
  
  getSession(sessionId: string): ClaudeHostSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  getAllSessions(): ClaudeHostSession[] {
    return Array.from(this.sessions.values());
  }
}