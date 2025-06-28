#!/usr/bin/env node

/**
 * Claude Host Proxy
 * Runs on the host system and provides a socket for Docker to communicate with
 * This allows Docker to execute Claude commands using the host's authentication
 */

const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SOCKET_PATH = '/tmp/claude-host-proxy.sock';
const PORT = 9876; // Fallback to TCP if socket doesn't work

// Clean up existing socket
if (fs.existsSync(SOCKET_PATH)) {
  fs.unlinkSync(SOCKET_PATH);
}

function executeClaudeCommand(command, workingDir, callback) {
  console.log(`[Claude Host Proxy] Executing: ${command.substring(0, 100)}...`);
  console.log(`[Claude Host Proxy] Working directory: ${workingDir}`);
  
  // Use spawn for better control
  // Claude expects a natural language prompt, not a shell command
  const args = ['-p', '--output-format', 'json', '--dangerously-skip-permissions', '--max-turns', '5', command];
  console.log(`[Claude Host Proxy] Running claude with args:`, args);
  
  const claude = spawn('claude', args, {
    cwd: workingDir,
    env: process.env,
    shell: false // Don't use shell to avoid escaping issues
  });
  
  console.log(`[Claude Host Proxy] Spawned Claude process with PID: ${claude.pid}`);
  
  let output = '';
  let error = '';
  let responseReceived = false;
  let timeout = null;
  
  // Set a timeout (Claude typically responds in 2-5 seconds)
  timeout = setTimeout(() => {
    console.log(`[Claude Host Proxy] Timeout reached, killing Claude process`);
    if (claude.killed === false) {
      claude.kill('SIGTERM');
    }
    if (!responseReceived) {
      responseReceived = true;
      callback({ error: 'Claude command timed out after 30 seconds' });
    }
  }, 30000);
  
  claude.stdout.on('data', (data) => {
    const chunk = data.toString();
    output += chunk;
    console.log(`[Claude Host Proxy] stdout chunk (${chunk.length} bytes)`);
  });
  
  claude.stderr.on('data', (data) => {
    const chunk = data.toString();
    error += chunk;
    console.log(`[Claude Host Proxy] stderr chunk: ${chunk.substring(0, 200)}`);
  });
  
  claude.on('close', (code) => {
    clearTimeout(timeout);
    console.log(`[Claude Host Proxy] Claude process closed with code: ${code}`);
    console.log(`[Claude Host Proxy] Total output length: ${output.length}`);
    console.log(`[Claude Host Proxy] Total error length: ${error.length}`);
    
    if (responseReceived) {
      console.log(`[Claude Host Proxy] Response already sent, ignoring close event`);
      return;
    }
    responseReceived = true;
    
    if (code !== 0) {
      console.log(`[Claude Host Proxy] Sending error response`);
      console.log(`[Claude Host Proxy] Error output: ${error}`);
      callback({ error: `Claude exited with code ${code}: ${error}` });
    } else {
      // Try to parse JSON output format
      try {
        console.log(`[Claude Host Proxy] Raw stdout: ${output}`);
        const jsonResult = JSON.parse(output);
        console.log(`[Claude Host Proxy] JSON parsed successfully`);
        
        if (jsonResult.type === 'result' && jsonResult.result !== undefined) {
          console.log(`[Claude Host Proxy] Sending result: ${String(jsonResult.result).substring(0, 200)}`);
          callback({ output: jsonResult.result });
        } else if (jsonResult.is_error) {
          console.log(`[Claude Host Proxy] Sending error from JSON`);
          callback({ error: jsonResult.error || 'Claude returned an error' });
        } else {
          // Fallback to raw output
          console.log(`[Claude Host Proxy] JSON structure not recognized, sending raw`);
          callback({ output: output });
        }
      } catch (e) {
        // Not JSON, return raw output
        console.log(`[Claude Host Proxy] JSON parse failed: ${e.message}`);
        callback({ output: output });
      }
    }
  });
  
  claude.on('error', (err) => {
    clearTimeout(timeout);
    console.log(`[Claude Host Proxy] Process error: ${err.message}`);
    if (!responseReceived) {
      responseReceived = true;
      callback({ error: `Failed to start Claude: ${err.message}` });
    }
  });
}

function handleConnection(socket) {
  console.log('[Claude Host Proxy] Client connected');
  
  let buffer = '';
  let isProcessing = false;
  
  // Keep socket alive
  socket.setKeepAlive(true, 1000);
  socket.setTimeout(0); // No timeout
  
  socket.on('data', (data) => {
    buffer += data.toString();
    console.log(`[Claude Host Proxy] Received data: ${buffer.length} bytes`);
    
    // Check for complete JSON message
    try {
      const message = JSON.parse(buffer);
      buffer = '';
      
      if (isProcessing) {
        console.log('[Claude Host Proxy] Already processing a command, ignoring');
        return;
      }
      
      isProcessing = true;
      console.log('[Claude Host Proxy] Parsed message:', JSON.stringify(message));
      
      // Execute Claude command
      executeClaudeCommand(
        message.command,
        message.workingDirectory || process.cwd(),
        (result) => {
          console.log(`[Claude Host Proxy] Command completed, sending response`);
          console.log(`[Claude Host Proxy] Response:`, JSON.stringify(result).substring(0, 200));
          
          try {
            if (!socket.destroyed && socket.writable) {
              socket.write(JSON.stringify(result) + '\n', (err) => {
                if (err) {
                  console.error('[Claude Host Proxy] Error writing response:', err);
                } else {
                  console.log(`[Claude Host Proxy] Response sent successfully`);
                }
                isProcessing = false;
              });
            } else {
              console.log('[Claude Host Proxy] Socket is no longer writable');
              isProcessing = false;
            }
          } catch (e) {
            console.error('[Claude Host Proxy] Exception writing response:', e);
            isProcessing = false;
          }
        }
      );
    } catch (e) {
      // Wait for more data if JSON is incomplete
      if (buffer.length > 10000) {
        // Prevent buffer overflow
        console.log('[Claude Host Proxy] Buffer overflow, clearing');
        socket.write(JSON.stringify({ error: 'Message too large' }) + '\n');
        buffer = '';
      }
    }
  });
  
  socket.on('end', () => {
    console.log('[Claude Host Proxy] Client disconnected (end event)');
  });
  
  socket.on('close', () => {
    console.log('[Claude Host Proxy] Client disconnected (close event)');
  });
  
  socket.on('error', (err) => {
    console.error('[Claude Host Proxy] Socket error:', err.message);
  });
}

// Always use TCP for Docker compatibility
const server = net.createServer(handleConnection);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Claude Host Proxy] Listening on TCP port: ${PORT}`);
});

server.on('error', (err) => {
  console.error('[Claude Host Proxy] Server error:', err);
  process.exit(1);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n[Claude Host Proxy] Shutting down...');
  server.close();
  if (fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
  }
  process.exit(0);
});