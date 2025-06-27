#!/usr/bin/env node

/**
 * Claude Host Proxy - Streaming Version
 * Runs on the host system and provides a socket for Docker to communicate with
 * This allows Docker to execute Claude commands using the host's authentication
 * Streams output as it arrives instead of waiting for completion
 */

const net = require('net');
const { spawn } = require('child_process');

const PORT = 9876;

function handleConnection(socket) {
  console.log('[Claude Host Proxy] Client connected');
  
  let buffer = '';
  let currentProcess = null;
  
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
      
      console.log('[Claude Host Proxy] Parsed message:', JSON.stringify(message));
      
      // Kill any existing process
      if (currentProcess && !currentProcess.killed) {
        console.log('[Claude Host Proxy] Killing existing process');
        currentProcess.kill('SIGTERM');
      }
      
      // Execute Claude command
      const args = ['-p', '--output-format', 'json', '--dangerously-skip-permissions', '--max-turns', '5', message.command];
      console.log(`[Claude Host Proxy] Running claude with args:`, args);
      
      currentProcess = spawn('/usr/local/bin/claude', args, {
        cwd: message.workingDirectory || process.cwd(),
        env: process.env,
        shell: false
      });
      
      console.log(`[Claude Host Proxy] Spawned Claude process with PID: ${currentProcess.pid}`);
      
      // Stream stdout directly to socket
      currentProcess.stdout.on('data', (chunk) => {
        const data = chunk.toString();
        console.log(`[Claude Host Proxy] Streaming stdout chunk (${chunk.length} bytes)`);
        
        // Wrap each chunk in a streaming response
        const streamResponse = {
          type: 'stream',
          data: data
        };
        
        if (socket.writable) {
          socket.write(JSON.stringify(streamResponse) + '\n');
        }
      });
      
      // Stream stderr as error messages
      currentProcess.stderr.on('data', (chunk) => {
        const data = chunk.toString();
        console.log(`[Claude Host Proxy] stderr: ${data}`);
        
        const errorResponse = {
          type: 'error',
          data: data
        };
        
        if (socket.writable) {
          socket.write(JSON.stringify(errorResponse) + '\n');
        }
      });
      
      currentProcess.on('close', (code) => {
        console.log(`[Claude Host Proxy] Claude process closed with code: ${code}`);
        
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
        
        const errorResponse = {
          type: 'error',
          data: `Failed to start Claude: ${err.message}`
        };
        
        if (socket.writable) {
          socket.write(JSON.stringify(errorResponse) + '\n');
        }
        
        currentProcess = null;
      });
      
    } catch (e) {
      // Wait for more data if JSON is incomplete
      if (buffer.length > 10000) {
        console.log('[Claude Host Proxy] Buffer overflow, clearing');
        
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
    console.log('[Claude Host Proxy] Client disconnected (end event)');
    
    // Kill any running process
    if (currentProcess && !currentProcess.killed) {
      console.log('[Claude Host Proxy] Killing process on disconnect');
      currentProcess.kill('SIGTERM');
    }
  });
  
  socket.on('close', () => {
    console.log('[Claude Host Proxy] Client disconnected (close event)');
  });
  
  socket.on('error', (err) => {
    console.error('[Claude Host Proxy] Socket error:', err.message);
    
    // Kill any running process
    if (currentProcess && !currentProcess.killed) {
      console.log('[Claude Host Proxy] Killing process on error');
      currentProcess.kill('SIGTERM');
    }
  });
}

// Create TCP server
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
  process.exit(0);
});