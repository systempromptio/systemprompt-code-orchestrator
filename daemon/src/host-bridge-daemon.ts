#!/usr/bin/env node

/**
 * Host Bridge Daemon - TypeScript Version
 * Bridges Docker containers to host CLI tools (Claude, Gemini, etc.)
 * Provides secure execution of host commands from isolated containers
 */

import * as net from 'net';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface DaemonConfig {
  tools: {
    claude?: string;
    gemini?: string;
    [key: string]: string | undefined;
  };
  shellPath: string;
  port: number;
  logFile: string;
  pidFile: string;
}

interface BridgeMessage {
  tool: 'claude' | 'gemini' | string;
  command: string;
  workingDirectory?: string;
}

interface BridgeResponse {
  type: 'stream' | 'error' | 'complete';
  data?: string;
  code?: number;
}

// Environment validation
class EnvironmentValidator {
  static validate(): DaemonConfig {
    const errors: string[] = [];
    const tools: DaemonConfig['tools'] = {};
    
    // Check for available tools
    const claudePath = process.env.CLAUDE_PATH || '';
    if (claudePath && fs.existsSync(claudePath)) {
      tools.claude = claudePath;
    }
    
    const geminiPath = process.env.GEMINI_PATH || '';
    if (geminiPath && fs.existsSync(geminiPath)) {
      tools.gemini = geminiPath;
    }
    
    // Check shell path
    const shellPath = process.env.SHELL_PATH || '/bin/bash';
    if (!fs.existsSync(shellPath)) {
      errors.push(`Shell not found at: ${shellPath}`);
    }
    
    // Check port
    const port = parseInt(process.env.HOST_BRIDGE_PORT || '9876', 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push('Invalid HOST_BRIDGE_PORT: must be between 1 and 65535');
    }
    
    // Setup paths
    const logsDir = path.join(__dirname, '..', '..', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const config: DaemonConfig = {
      tools,
      shellPath,
      port,
      logFile: path.join(logsDir, 'host-bridge.log'),
      pidFile: path.join(logsDir, 'daemon.pid')
    };
    
    // Log validation results
    console.log('[Host Bridge Daemon] Environment validation:');
    console.log(`- Available tools: ${Object.keys(tools).join(', ') || 'none'}`);
    console.log(`- Shell: ${shellPath}`);
    console.log(`- Port: ${port}`);
    
    if (Object.keys(tools).length === 0) {
      console.warn('\n[Host Bridge Daemon] Warning: No tools available');
      console.warn('Set CLAUDE_PATH or GEMINI_PATH to enable tool execution');
    }
    
    if (errors.length > 0) {
      console.error('\n[Host Bridge Daemon] Validation errors:');
      errors.forEach(err => console.error(`  - ${err}`));
    }
    
    return config;
  }
}

// Logger class
class Logger {
  private logStream: fs.WriteStream;
  
  constructor(logFile: string) {
    this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
  }
  
  log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(message);
    this.logStream.write(logMessage + '\n');
  }
  
  error(message: string, error?: Error): void {
    this.log(`ERROR: ${message}`);
    if (error) {
      this.log(`Stack: ${error.stack}`);
    }
  }
  
  close(): void {
    this.logStream.end();
  }
}

// Main daemon class
class HostBridgeDaemon {
  private config: DaemonConfig;
  private logger: Logger;
  private server: net.Server | null = null;
  private activeProcesses: Map<string, ChildProcess> = new Map();
  
  constructor(config: DaemonConfig) {
    this.config = config;
    this.logger = new Logger(config.logFile);
  }
  
  start(): void {
    this.logger.log('[Host Bridge Daemon] Starting with configuration:');
    this.logger.log(`- Available tools: ${Object.keys(this.config.tools).join(', ')}`);
    this.logger.log(`- Shell: ${this.config.shellPath}`);
    this.logger.log(`- Port: ${this.config.port}`);
    this.logger.log(`- Working directory: ${process.cwd()}`);
    this.logger.log(`- Node version: ${process.version}`);
    
    this.server = net.createServer((socket) => this.handleConnection(socket));
    
    this.server.on('error', (err) => {
      this.logger.error('Server error', err);
      process.exit(1);
    });
    
    this.server.listen(this.config.port, '0.0.0.0', () => {
      this.logger.log(`[Host Bridge Daemon] Server listening on port ${this.config.port}`);
      
      // Write PID file
      fs.writeFileSync(this.config.pidFile, process.pid.toString());
      
      // Handle graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
    });
  }
  
  private handleConnection(socket: net.Socket): void {
    const connectionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.logger.log(`[Host Bridge Daemon] Client connected (${connectionId})`);
    
    let buffer = '';
    let currentProcess: ChildProcess | null = null;
    
    // Keep socket alive
    socket.setKeepAlive(true, 1000);
    socket.setTimeout(0); // No timeout
    
    socket.on('data', (data) => {
      buffer += data.toString();
      this.logger.log(`[Host Bridge Daemon] Received data: ${buffer.length} bytes`);
      
      // Check for complete JSON message
      try {
        const message: BridgeMessage = JSON.parse(buffer);
        buffer = '';
        
        this.logger.log(`[Host Bridge Daemon] Parsed message: ${JSON.stringify(message)}`);
        
        // Kill any existing process for this connection
        if (currentProcess && !currentProcess.killed) {
          this.logger.log('[Host Bridge Daemon] Killing existing process');
          currentProcess.kill('SIGTERM');
          this.activeProcesses.delete(connectionId);
        }
        
        // Check if tool is available
        const toolPath = this.config.tools[message.tool];
        if (!toolPath) {
          const errorResponse: BridgeResponse = {
            type: 'error',
            data: `Tool '${message.tool}' is not available. Available tools: ${Object.keys(this.config.tools).join(', ')}`
          };
          socket.write(JSON.stringify(errorResponse) + '\n');
          return;
        }
        
        // Execute command
        currentProcess = this.executeCommand(message, toolPath, socket, connectionId);
        this.activeProcesses.set(connectionId, currentProcess);
        
      } catch (e) {
        // Wait for more data if JSON is incomplete
        if (buffer.length > 10000) {
          this.logger.log('[Host Bridge Daemon] Buffer overflow, clearing');
          
          const errorResponse: BridgeResponse = {
            type: 'error',
            data: 'Message too large'
          };
          
          socket.write(JSON.stringify(errorResponse) + '\n');
          buffer = '';
        }
      }
    });
    
    socket.on('end', () => {
      this.logger.log(`[Host Bridge Daemon] Client disconnected (${connectionId})`);
      this.cleanupConnection(connectionId);
    });
    
    socket.on('close', () => {
      this.logger.log(`[Host Bridge Daemon] Client closed (${connectionId})`);
      this.cleanupConnection(connectionId);
    });
    
    socket.on('error', (err) => {
      this.logger.error(`Socket error (${connectionId})`, err);
      this.cleanupConnection(connectionId);
    });
  }
  
  private executeCommand(
    message: BridgeMessage,
    toolPath: string,
    socket: net.Socket,
    connectionId: string
  ): ChildProcess {
    // Build command args based on tool
    let args: string[] = [];
    
    if (message.tool === 'claude') {
      args = [
        '-p',
        '--output-format', 'json',
        '--dangerously-skip-permissions',
        '--max-turns', '5',
        message.command
      ];
    } else if (message.tool === 'gemini') {
      // Add Gemini-specific args when needed
      args = [message.command];
    } else {
      // Generic command execution
      args = [message.command];
    }
    
    this.logger.log(`[Host Bridge Daemon] Running ${message.tool} with args: ${JSON.stringify(args)}`);
    
    const command = `${toolPath} ${args.map(arg => `'${arg.replace(/'/g, "'\\''")}'`).join(' ')}`;
    this.logger.log(`[Host Bridge Daemon] Executing command: ${command}`);
    
    const options = {
      cwd: message.workingDirectory || process.cwd(),
      env: process.env,
      shell: this.config.shellPath,
      stdio: ['pipe', 'pipe', 'pipe'] as ['pipe', 'pipe', 'pipe']
    };
    
    const childProcess = spawn(command, [], options);
    
    this.logger.log(`[Host Bridge Daemon] Spawned ${message.tool} process with PID: ${childProcess.pid}`);
    
    // Close stdin immediately since we're not sending any input
    if (childProcess.stdin) {
      this.logger.log('[Host Bridge Daemon] Closing stdin to signal no more input');
      childProcess.stdin.end();
    }
    
    // Handle stdout
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (chunk: Buffer) => {
        const data = chunk.toString();
        this.logger.log(`[Host Bridge Daemon] Streaming stdout chunk (${chunk.length} bytes)`);
        
        const streamResponse: BridgeResponse = {
          type: 'stream',
          data: data
        };
        
        if (socket.writable && !socket.destroyed) {
          socket.write(JSON.stringify(streamResponse) + '\n');
          this.logger.log('[Host Bridge Daemon] Data sent to client');
        } else {
          this.logger.log('[Host Bridge Daemon] Socket not writable - data lost!');
        }
      });
    }
    
    // Handle stderr
    if (childProcess.stderr) {
      childProcess.stderr.on('data', (chunk: Buffer) => {
        const data = chunk.toString();
        this.logger.log(`[Host Bridge Daemon] stderr: ${data}`);
        
        const errorResponse: BridgeResponse = {
          type: 'error',
          data: data
        };
        
        if (socket.writable && !socket.destroyed) {
          socket.write(JSON.stringify(errorResponse) + '\n');
        }
      });
    }
    
    // Handle process close
    childProcess.on('close', (code: number | null) => {
      this.logger.log(`[Host Bridge Daemon] ${message.tool} process closed with code: ${code}`);
      
      const completeResponse: BridgeResponse = {
        type: 'complete',
        code: code || 0
      };
      
      if (socket.writable && !socket.destroyed) {
        socket.write(JSON.stringify(completeResponse) + '\n');
      }
      
      this.activeProcesses.delete(connectionId);
    });
    
    // Handle process error
    childProcess.on('error', (err: Error) => {
      this.logger.error(`Process error (${connectionId})`, err);
      
      const errorResponse: BridgeResponse = {
        type: 'error',
        data: `Failed to start ${message.tool}: ${err.message}`
      };
      
      if (socket.writable && !socket.destroyed) {
        socket.write(JSON.stringify(errorResponse) + '\n');
      }
      
      this.activeProcesses.delete(connectionId);
    });
    
    return childProcess;
  }
  
  private cleanupConnection(connectionId: string): void {
    const process = this.activeProcesses.get(connectionId);
    if (process && !process.killed) {
      this.logger.log(`[Host Bridge Daemon] Killing process for connection ${connectionId}`);
      process.kill('SIGTERM');
      this.activeProcesses.delete(connectionId);
    }
  }
  
  private shutdown(): void {
    this.logger.log('[Host Bridge Daemon] Shutting down...');
    
    // Kill all active processes
    this.activeProcesses.forEach((process, id) => {
      if (!process.killed) {
        this.logger.log(`[Host Bridge Daemon] Killing process ${id}`);
        process.kill('SIGTERM');
      }
    });
    
    // Close server
    if (this.server) {
      this.server.close(() => {
        this.logger.log('[Host Bridge Daemon] Server closed');
        
        // Remove PID file
        if (fs.existsSync(this.config.pidFile)) {
          fs.unlinkSync(this.config.pidFile);
        }
        
        this.logger.close();
        process.exit(0);
      });
    }
  }
}

// Export config for Docker startup
export function getValidatedConfig(): DaemonConfig {
  return EnvironmentValidator.validate();
}

// Main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = EnvironmentValidator.validate();
  const daemon = new HostBridgeDaemon(config);
  daemon.start();
}