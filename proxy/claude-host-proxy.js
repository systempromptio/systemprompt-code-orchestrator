#!/usr/bin/env node

/**
 * Claude Host Proxy - Streaming Version
 * Runs on the host system and provides a socket for Docker to communicate with
 * This allows Docker to execute Claude commands using the host's authentication
 * Streams output as it arrives instead of waiting for completion
 */

const net = require('net');
const { spawn, execFile, exec, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.CLAUDE_PROXY_PORT || 9876;

// Log environment variables at startup
console.log('[Claude Host Proxy] Starting with environment:');
console.log('- CLAUDE_PATH:', process.env.CLAUDE_PATH);
console.log('- SHELL_PATH:', process.env.SHELL_PATH);
console.log('- CLAUDE_AVAILABLE:', process.env.CLAUDE_AVAILABLE);
console.log('- Working directory:', process.cwd());
console.log('- Node version:', process.version);

// Setup logging
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logStream = fs.createWriteStream(path.join(logsDir, 'claude-proxy.log'), { flags: 'a' });
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  logStream.write(logMessage);
};

function handleConnection(socket) {
  log('[Claude Host Proxy] Client connected');
  
  let buffer = '';
  let currentProcess = null;
  
  // Keep socket alive
  socket.setKeepAlive(true, 1000);
  socket.setTimeout(0); // No timeout
  
  socket.on('data', (data) => {
    buffer += data.toString();
    log(`[Claude Host Proxy] Received data: ${buffer.length} bytes`);
    
    // Check for complete JSON message
    try {
      const message = JSON.parse(buffer);
      buffer = '';
      
      log('[Claude Host Proxy] Parsed message:', JSON.stringify(message));
      
      // Kill any existing process
      if (currentProcess && !currentProcess.killed) {
        log('[Claude Host Proxy] Killing existing process');
        currentProcess.kill('SIGTERM');
      }
      
      // Execute Claude command
      const args = ['-p', '--output-format', 'json', '--dangerously-skip-permissions', '--max-turns', '5', message.command];
      log(`[Claude Host Proxy] Running claude with args:`, args);
      
      // Get tool path from environment
      const claudePath = process.env.CLAUDE_PATH;
      
      if (!claudePath) {
        throw new Error('CLAUDE_PATH not set - Claude not available on host');
      }
      
      // Execute claude - since it's a shell script, we need to use spawn with shell:true
      log(`[Claude Host Proxy] Executing: ${claudePath} ${args.join(' ')}`);
      
      // Execute using spawn with the detected shell path from environment
      const shellPath = process.env.SHELL_PATH;
      if (!shellPath) {
        throw new Error('SHELL_PATH not set - shell not detected during startup');
      }
      
      // Debug environment and paths
      log(`[Claude Host Proxy] Environment check:`);
      log(`[Claude Host Proxy] - CLAUDE_PATH env: ${process.env.CLAUDE_PATH}`);
      log(`[Claude Host Proxy] - SHELL_PATH env: ${process.env.SHELL_PATH}`);
      log(`[Claude Host Proxy] - claudePath variable: ${claudePath}`);
      log(`[Claude Host Proxy] - shellPath variable: ${shellPath}`);
      log(`[Claude Host Proxy] - Shell exists: ${fs.existsSync(shellPath)}`);
      log(`[Claude Host Proxy] - Claude exists: ${fs.existsSync(claudePath)}`);
      log(`[Claude Host Proxy] - Working dir: ${message.workingDirectory || process.cwd()}`);
      
      const command = `${claudePath} ${args.map(arg => `'${arg.replace(/'/g, "'\\''")}'`).join(' ')}`;
      log(`[Claude Host Proxy] Using detected shell: ${shellPath}`);
      log(`[Claude Host Proxy] Executing command: ${command}`);
      
      try {
        // Use spawn with shell to handle the script execution and get streaming output
        const options = {
          cwd: message.workingDirectory || process.cwd(),
          env: process.env,
          shell: shellPath,
          stdio: ['pipe', 'pipe', 'pipe']
        };
        
        log(`[Claude Host Proxy] Spawn options:`, JSON.stringify({
          cwd: options.cwd,
          shell: options.shell,
          envKeys: Object.keys(options.env).filter(k => k.includes('CLAUDE') || k.includes('SHELL'))
        }));
        
        // Use spawn to get immediate access to stdout/stderr streams
        currentProcess = spawn(command, [], options);
        
        log(`[Claude Host Proxy] Spawned process with PID: ${currentProcess.pid}`);
      } catch (spawnError) {
        log(`[Claude Host Proxy] Spawn failed immediately: ${spawnError.message}`);
        log(`[Claude Host Proxy] Error stack:`, spawnError.stack);
        
        const errorResponse = {
          type: 'error',
          data: `Failed to spawn Claude: ${spawnError.message}`
        };
        
        if (socket.writable) {
          socket.write(JSON.stringify(errorResponse) + '\n');
        }
        return;
      }
      
      log(`[Claude Host Proxy] Spawned Claude process with PID: ${currentProcess.pid}`);
      log(`[Claude Host Proxy] Process stdout available: ${!!currentProcess.stdout}`);
      log(`[Claude Host Proxy] Process stderr available: ${!!currentProcess.stderr}`);
      log(`[Claude Host Proxy] Process stdin available: ${!!currentProcess.stdin}`);
      
      // Close stdin immediately since we're not sending any input
      // This tells Claude that there's no more input coming
      if (currentProcess.stdin) {
        log(`[Claude Host Proxy] Closing stdin to signal no more input`);
        currentProcess.stdin.end();
      }
      
      // Handle execFile callback for completion
      currentProcess.on('exit', (code) => {
        log(`[Claude Host Proxy] Claude process exited with code: ${code}`);
      });
      
      // Stream stdout directly to socket
      if (currentProcess.stdout) {
        log(`[Claude Host Proxy] Setting up stdout handler`);
        currentProcess.stdout.on('data', (chunk) => {
          const data = chunk.toString();
          log(`[Claude Host Proxy] Streaming stdout chunk (${chunk.length} bytes)`);
          log(`[Claude Host Proxy] Socket writable: ${socket.writable}`);
          log(`[Claude Host Proxy] Socket destroyed: ${socket.destroyed}`);
          log(`[Claude Host Proxy] First 100 chars: ${data.substring(0, 100)}`);
          
          // Wrap each chunk in a streaming response
          const streamResponse = {
            type: 'stream',
            data: data
          };
          
          if (socket.writable && !socket.destroyed) {
            socket.write(JSON.stringify(streamResponse) + '\n');
            log(`[Claude Host Proxy] Data sent to client`);
          } else {
            log(`[Claude Host Proxy] Socket not writable - data lost!`);
          }
        });
        
        // Also listen for end event
        currentProcess.stdout.on('end', () => {
          log(`[Claude Host Proxy] stdout stream ended`);
        });
      } else {
        log(`[Claude Host Proxy] WARNING: No stdout stream available on process`);
      }
      
      // Stream stderr as error messages
      if (currentProcess.stderr) {
        currentProcess.stderr.on('data', (chunk) => {
          const data = chunk.toString();
          log(`[Claude Host Proxy] stderr: ${data}`);
        
        const errorResponse = {
          type: 'error',
          data: data
        };
        
        if (socket.writable) {
          socket.write(JSON.stringify(errorResponse) + '\n');
        }
      });
      
      currentProcess.on('close', (code) => {
        log(`[Claude Host Proxy] Claude process closed with code: ${code}`);
        
        // Send completion message
        const completeResponse = {
          type: 'complete',
          code: code
        };
        
        if (socket.writable) {
          socket.write(JSON.stringify(completeResponse) + '\n');
        }
        
        currentProcess = null;
      });
      
      currentProcess.on('error', (err) => {
        console.error(`[Claude Host Proxy] Process error: ${err.message}`);
        console.error(`[Claude Host Proxy] Error details:`, err);
        
        const errorResponse = {
          type: 'error',
          data: `Failed to start Claude: ${err.message}`
        };
        
        if (socket.writable) {
          socket.write(JSON.stringify(errorResponse) + '\n');
        }
        
        currentProcess = null;
      });
      
    } // End of outer try block
    } catch (e) {
      // Wait for more data if JSON is incomplete
      if (buffer.length > 10000) {
        log('[Claude Host Proxy] Buffer overflow, clearing');
        
        const errorResponse = {
          type: 'error',
          data: 'Message too large'
        };
        
        socket.write(JSON.stringify(errorResponse) + '\n');
        buffer = '';
      }
    }
  });
  
  socket.on('end', () => {
    log('[Claude Host Proxy] Client disconnected (end event)');
    
    // Kill any running process
    if (currentProcess && !currentProcess.killed) {
      log('[Claude Host Proxy] Killing process on disconnect');
      currentProcess.kill('SIGTERM');
    }
  });
  
  socket.on('close', () => {
    log('[Claude Host Proxy] Client disconnected (close event)');
  });
  
  socket.on('error', (err) => {
    console.error('[Claude Host Proxy] Socket error:', err.message);
    
    // Kill any running process
    if (currentProcess && !currentProcess.killed) {
      log('[Claude Host Proxy] Killing process on error');
      currentProcess.kill('SIGTERM');
    }
  });
}

// Create TCP server
const server = net.createServer(handleConnection);

server.listen(PORT, '0.0.0.0', () => {
  log(`[Claude Host Proxy] Listening on TCP port: ${PORT}`);
});

server.on('error', (err) => {
  console.error('[Claude Host Proxy] Server error:', err);
  process.exit(1);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n[Claude Host Proxy] Shutting down...');
  server.close();
  process.exit(0);
});