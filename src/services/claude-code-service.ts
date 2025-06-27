import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { query, type SDKMessage, type SDKAssistantMessage, type Options } from '@anthropic-ai/claude-code';

export interface ClaudeCodeSession {
  id: string;
  abortController?: AbortController;
  status: 'initializing' | 'ready' | 'busy' | 'error' | 'terminated';
  workingDirectory: string;
  options: ClaudeCodeOptions;
  outputBuffer: SDKMessage[];
  errorBuffer: string[];
  createdAt: Date;
  lastActivity: Date;
}

export interface ClaudeCodeOptions extends Partial<Options> {
  workingDirectory?: string;
  timeout?: number;
}

export interface ClaudeCodeResponse {
  type: 'message' | 'tool_use' | 'error' | 'completion';
  content?: string;
  toolName?: string;
  toolInput?: any;
  error?: string;
}

export class ClaudeCodeService extends EventEmitter {
  private static instance: ClaudeCodeService;
  private sessions: Map<string, ClaudeCodeSession> = new Map();
  
  private constructor() {
    super();
  }
  
  static getInstance(): ClaudeCodeService {
    if (!ClaudeCodeService.instance) {
      ClaudeCodeService.instance = new ClaudeCodeService();
    }
    return ClaudeCodeService.instance;
  }
  
  async createSession(options: ClaudeCodeOptions = {}): Promise<string> {
    const sessionId = `claude_${uuidv4()}`;
    const workingDirectory = options.workingDirectory || process.cwd();
    
    const session: ClaudeCodeSession = {
      id: sessionId,
      status: 'initializing',
      workingDirectory,
      options,
      outputBuffer: [],
      errorBuffer: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    this.sessions.set(sessionId, session);
    this.emit('session:created', { sessionId });
    
    // For now, just mark as ready - in real implementation would spawn process
    session.status = 'ready';
    this.emit('session:ready', { sessionId });
    
    return sessionId;
  }
  
  async querySync(sessionId: string, prompt: string, options?: Partial<ClaudeCodeOptions>): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    if (session.status !== 'ready') {
      throw new Error(`Session ${sessionId} is ${session.status}`);
    }
    
    session.status = 'busy';
    session.lastActivity = new Date();
    
    // Configure timeout (default 30 seconds, can be overridden)
    const timeoutMs = options?.timeout || 30000;
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      const messages: SDKMessage[] = [];
      const abortController = new AbortController();
      session.abortController = abortController;
      
      // Build query options, filtering out undefined values
      const queryOptions: Options = {};
      
      // Always set cwd to workingDirectory
      queryOptions.cwd = session.workingDirectory;
      
      // Set maxTurns with proper fallback
      queryOptions.maxTurns = options?.maxTurns || session.options.maxTurns || 1;
      
      // Only set other options if they have values
      if (options?.model || session.options.model) {
        queryOptions.model = options?.model || session.options.model;
      }
      
      if (options?.allowedTools || session.options.allowedTools) {
        queryOptions.allowedTools = options?.allowedTools || session.options.allowedTools;
      }
      
      if (options?.customSystemPrompt || session.options.customSystemPrompt) {
        queryOptions.customSystemPrompt = options?.customSystemPrompt || session.options.customSystemPrompt;
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          abortController.abort();
          reject(new Error(`Query timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Create query promise
      const queryPromise = (async () => {
        try {
          for await (const message of query({
            prompt,
            abortController,
            options: queryOptions
          })) {
            messages.push(message);
            session.outputBuffer.push(message);
            session.lastActivity = new Date();
          }
        } catch (error) {
          // If aborted, this is expected
          if (abortController.signal.aborted) {
            throw new Error(`Query aborted: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          throw error;
        }
      })();

      // Race between query and timeout
      await Promise.race([queryPromise, timeoutPromise]);
      
      // Clear timeout if query completed successfully
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      session.status = 'ready';
      
      // Return the concatenated content from assistant messages
      return messages
        .filter((m): m is SDKAssistantMessage => m.type === 'assistant')
        .map(m => {
          if (m.message.content) {
            return m.message.content
              .filter((c: any): c is { type: 'text'; text: string } => c.type === 'text')
              .map((c: any) => c.text)
              .join('');
          }
          return '';
        })
        .join('\n');
    } catch (error) {
      session.status = 'error';
      session.errorBuffer.push(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      // Clean up timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      session.abortController = undefined;
    }
  }
  
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    // Abort any ongoing operations
    if (session.abortController) {
      session.abortController.abort();
    }
    
    session.status = 'terminated';
    this.sessions.delete(sessionId);
    this.emit('session:terminated', { sessionId });
  }
  
  getSession(sessionId: string): ClaudeCodeSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  getAllSessions(): ClaudeCodeSession[] {
    return Array.from(this.sessions.values());
  }
}