import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { query, type SDKMessage, type SDKAssistantMessage, type Options } from '@anthropic-ai/claude-code';
import * as net from 'net';

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
  taskId?: string; // Associated task ID for progress tracking
  streamBuffer: string[]; // Capture all streaming output
}

export interface ClaudeCodeOptions extends Partial<Options> {
  workingDirectory?: string;
  timeout?: number;
  maxTurns?: number;
  model?: string;
  allowedTools?: string[];
  customSystemPrompt?: string;
}

export interface ClaudeCodeResponse {
  type: 'message' | 'tool_use' | 'error' | 'completion';
  content?: string;
  toolName?: string;
  toolInput?: unknown;
  error?: string;
}

export class ClaudeCodeService extends EventEmitter {
  private static instance: ClaudeCodeService;
  private sessions: Map<string, ClaudeCodeSession> = new Map();
  private useHostProxy: boolean = false;
  
  private constructor() {
    super();
    // Check if we should use host proxy (when API key is not available)
    this.useHostProxy = !process.env.ANTHROPIC_API_KEY;
    if (this.useHostProxy) {
      console.log('[ClaudeCodeService] Using host proxy for Claude execution');
    }
  }
  
  static getInstance(): ClaudeCodeService {
    if (!ClaudeCodeService.instance) {
      ClaudeCodeService.instance = new ClaudeCodeService();
    }
    return ClaudeCodeService.instance;
  }
  
  setTaskId(sessionId: string, taskId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.taskId = taskId;
      console.log(`[ClaudeCodeService] Linked session ${sessionId} to task ${taskId}`);
    }
  }
  
  private parseProgressFromStream(session: ClaudeCodeSession, data: string): void {
    if (!session.taskId) return;
    
    // Parse common progress indicators
    const progressPatterns = [
      { pattern: /Creating branch ([\w\/-]+)/, event: 'branch:created' },
      { pattern: /Switched to .*branch '([\w\/-]+)'/, event: 'branch:switched' },
      { pattern: /Creating file: (.+)/, event: 'file:creating' },
      { pattern: /File created: (.+)/, event: 'file:created' },
      { pattern: /Running tests/, event: 'tests:running' },
      { pattern: /Tests passed/, event: 'tests:passed' },
      { pattern: /Building project/, event: 'build:started' },
      { pattern: /Build complete/, event: 'build:complete' },
      { pattern: /Executing: (.+)/, event: 'command:executing' },
      { pattern: /✓ (.+)/, event: 'step:completed' },
      { pattern: /Task completed/, event: 'task:completed' }
    ];
    
    for (const { pattern, event } of progressPatterns) {
      const match = data.match(pattern);
      if (match) {
        this.emit('task:progress', {
          sessionId: session.id,
          taskId: session.taskId,
          event,
          data: match[1] || data,
          timestamp: new Date()
        });
      }
    }
  }
  
  async createSession(options: ClaudeCodeOptions = {}): Promise<string> {
    const sessionId = `claude_${uuidv4()}`;
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
    
    console.log('[ClaudeCodeService] Creating session:', {
      sessionId,
      workingDirectory: session.workingDirectory,
      options
    });
    
    this.sessions.set(sessionId, session);
    this.emit('session:created', { sessionId });
    
    // Mark as ready immediately since the SDK handles session management
    session.status = 'ready';
    this.emit('session:ready', { sessionId });
    
    return sessionId;
  }
  
  private async executeViaHostProxy(prompt: string, workingDirectory: string, sessionId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('[ClaudeCodeService] Connecting to host proxy via TCP (streaming)');
      
      // Map Docker paths to host paths
      let hostWorkingDirectory = workingDirectory;
      if (workingDirectory.startsWith('/workspace')) {
        // Map /workspace to the actual host directory
        const hostRoot = process.env.HOST_FILE_ROOT || '/var/www/html/systemprompt-coding-agent';
        hostWorkingDirectory = workingDirectory.replace('/workspace', hostRoot);
        console.log(`[ClaudeCodeService] Mapped Docker path ${workingDirectory} to host path ${hostWorkingDirectory}`);
      }
      
      const client = net.createConnection({ port: 9876, host: 'host.docker.internal' }, () => {
        console.log('[ClaudeCodeService] Connected to host proxy');
        
        const message = JSON.stringify({
          command: prompt,
          workingDirectory: hostWorkingDirectory
        });
        
        client.write(message);
      });
      
      let buffer = '';
      const chunks: string[] = [];
      let hasCompleted = false;
      
      client.on('data', (data) => {
        buffer += data.toString();
        
        // Process line-delimited JSON
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              
              switch (response.type) {
                case 'stream':
                  // Collect streaming data
                  if (response.data) {
                    chunks.push(response.data);
                    // Emit streaming event for real-time updates
                    const session = sessionId ? this.sessions.get(sessionId) : undefined;
                    
                    this.emit('stream:data', { 
                      sessionId: sessionId || 'unknown',
                      data: response.data,
                      taskId: session?.taskId 
                    });
                    
                    // Store in session's stream buffer
                    if (session) {
                      session.streamBuffer.push(response.data);
                      
                      // Parse for progress indicators
                      this.parseProgressFromStream(session, response.data);
                    }
                  }
                  break;
                  
                case 'error':
                  console.error('[ClaudeCodeService] Host proxy error:', response.data);
                  reject(new Error(response.data || 'Host proxy error'));
                  break;
                  
                case 'complete':
                  hasCompleted = true;
                  client.end();
                  // Join all chunks for final result
                  resolve(chunks.join(''));
                  break;
                  
                default:
                  console.warn('[ClaudeCodeService] Unknown response type:', response);
              }
            } catch (e) {
              console.error('[ClaudeCodeService] Failed to parse line:', e, 'Line:', line);
            }
          }
        }
      });
      
      client.on('error', (err) => {
        if (!hasCompleted) {
          reject(new Error(`Host proxy connection failed: ${err.message}`));
        }
      });
      
      client.on('close', () => {
        if (!hasCompleted) {
          // Connection closed without completion
          if (chunks.length > 0) {
            // Return what we have so far
            resolve(chunks.join(''));
          } else {
            reject(new Error('Host proxy connection closed unexpectedly'));
          }
        }
      });
      
      // Timeout after 5 minutes for long-running commands
      setTimeout(() => {
        if (!hasCompleted) {
          client.destroy();
          reject(new Error('Host proxy timeout (5 minutes)'));
        }
      }, 300000);
    });
  }
  
  async querySync(sessionId: string, prompt: string, options?: Partial<ClaudeCodeOptions>): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    console.log('[ClaudeCodeService] Query requested:', {
      sessionId,
      status: session.status,
      prompt: prompt.substring(0, 100),
      workingDirectory: session.workingDirectory,
      useHostProxy: this.useHostProxy
    });
    
    if (session.status !== 'ready' && session.status !== 'busy') {
      throw new Error(`Session ${sessionId} is ${session.status}`);
    }
    
    session.status = 'busy';
    session.lastActivity = new Date();
    
    // Use host proxy if no API key
    if (this.useHostProxy) {
      try {
        const result = await this.executeViaHostProxy(prompt, session.workingDirectory, sessionId);
        session.status = 'ready';
        session.outputBuffer.push({ type: 'assistant', message: { content: [{ type: 'text', text: result }] } } as any);
        return result;
      } catch (error) {
        session.status = 'error';
        const errorMessage = error instanceof Error ? error.message : String(error);
        session.errorBuffer.push(errorMessage);
        throw error;
      }
    }
    
    // Configure timeout (default 30 seconds, can be overridden)
    const timeoutMs = options?.timeout || 30000;
    let timeoutId: NodeJS.Timeout | null = null;
    const messages: SDKMessage[] = [];
    
    try {
      const abortController = new AbortController();
      session.abortController = abortController;
      
      // Build query options, filtering out undefined values
      const queryOptions: Options = {};
      
      if (options?.maxTurns || session.options.maxTurns) {
        queryOptions.maxTurns = options?.maxTurns || session.options.maxTurns;
      }
      
      if (options?.model || session.options.model) {
        queryOptions.model = options?.model || session.options.model;
      }
      
      // Ensure we're using the mapped workspace directory inside Docker
      queryOptions.cwd = '/workspace';
      
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
          if (m.message && m.message.content && Array.isArray(m.message.content)) {
            return m.message.content
              .filter((c: any): c is { type: 'text'; text: string } => c.type === 'text')
              .map((c: any) => c.text)
              .join('');
          }
          return '';
        })
        .join('\n');
    } catch (error) {
      console.error('[ClaudeCodeService] Query failed:', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Check for specific error messages
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (messages.length > 0) {
        const lastAssistantMessage = messages
          .filter((m): m is SDKAssistantMessage => m.type === 'assistant')
          .pop();
        
        if (lastAssistantMessage?.message?.content) {
          const content = lastAssistantMessage.message.content;
          if (Array.isArray(content)) {
            const textContent = content
              .filter((c: any): c is { type: 'text'; text: string } => c.type === 'text')
              .map((c: any) => c.text)
              .join(' ');
            
            if (textContent.includes('Credit balance is too low')) {
              errorMessage = 'Claude Code API Error: Credit balance is too low. Please check your Anthropic account.';
            } else if (textContent.includes('Invalid API key')) {
              errorMessage = 'Claude Code API Error: Invalid API key. Please check your ANTHROPIC_API_KEY.';
            } else if (textContent) {
              errorMessage = `Claude Code Error: ${textContent}`;
            }
          }
        }
      }
      
      session.status = 'error';
      session.errorBuffer.push(errorMessage);
      throw new Error(errorMessage);
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