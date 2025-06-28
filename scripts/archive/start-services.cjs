#!/usr/bin/env node

/**
 * Start Services Script
 * Manages both Docker container and Claude host proxy as background services
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { detectTools } = require('./detect-tools.cjs');

const PROXY_PORT = 9876;
const MCP_PORT = 3000;
const PROXY_LOG = path.join(process.cwd(), 'logs', 'claude-proxy.log');
const DOCKER_LOG = path.join(process.cwd(), 'logs', 'docker.log');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Check if a port is in use
function checkPort(port, host = 'localhost') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true)); // Port in use
    server.once('listening', () => {
      server.close();
      resolve(false); // Port available
    });
    server.listen(port, host);
  });
}

// Check if Docker container is running
function isDockerRunning() {
  try {
    const result = execSync('docker ps --format "{{.Names}}" | grep systemprompt-coding-agent-mcp-server-1', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

// Start the proxy server
async function startProxy() {
  const isProxyRunning = await checkPort(PROXY_PORT);
  
  if (isProxyRunning) {
    console.log('✓ Claude host proxy already running on port', PROXY_PORT);
    return;
  }
  
  console.log('Starting Claude host proxy...');
  
  const proxyDir = path.join(process.cwd(), 'proxy');
  
  // Load the .env.tools file into the environment for the proxy
  const envPath = path.join(process.cwd(), '.env.tools');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          envVars[key.trim()] = value.trim();
        }
      }
    });
    
    // Use npm run start:daemon to properly daemonize with env vars
    execSync('npm run start:daemon', {
      cwd: proxyDir,
      stdio: 'inherit',
      env: { ...process.env, ...envVars }
    });
  } else {
    // Use npm run start:daemon to properly daemonize
    execSync('npm run start:daemon', {
      cwd: proxyDir,
      stdio: 'inherit'
    });
  }
  
  // Wait a moment for proxy to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if proxy is listening
  if (await checkPort(PROXY_PORT)) {
    console.log('✓ Claude host proxy started on port', PROXY_PORT);
    console.log('  Log file:', PROXY_LOG);
  } else {
    console.log('⚠️  Claude host proxy may still be starting...');
    console.log('  Check logs at:', PROXY_LOG);
  }
}

// Start Docker services
async function startDocker() {
  if (isDockerRunning()) {
    console.log('✓ Docker container already running');
    return;
  }
  
  console.log('Building and starting Docker services...');
  
  try {
    // Build first
    execSync('docker-compose build', {
      stdio: 'inherit'
    });
    
    // Then start in detached mode
    execSync('docker-compose up -d', {
      stdio: 'inherit'
    });
    
    // Wait for MCP server to be ready
    console.log('Waiting for MCP server to be ready...');
    let attempts = 0;
    while (attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const response = await fetch(`http://localhost:${MCP_PORT}/health`);
        if (response.ok) {
          console.log('✓ MCP server is ready on port', MCP_PORT);
          return;
        }
      } catch {
        // Server not ready yet
      }
      
      attempts++;
    }
    
    throw new Error('MCP server failed to start within 30 seconds');
    
  } catch (error) {
    console.error('Failed to start Docker services:', error.message);
    throw error;
  }
}

// Show service status
function showStatus() {
  console.log('\n📊 Service Status:');
  console.log('─'.repeat(40));
  
  // Check proxy
  checkPort(PROXY_PORT).then(inUse => {
    console.log(`Claude Proxy: ${inUse ? '🟢 Running' : '🔴 Stopped'} (port ${PROXY_PORT})`);
  });
  
  // Check Docker
  if (isDockerRunning()) {
    console.log(`MCP Server:   🟢 Running (port ${MCP_PORT})`);
    console.log(`              http://localhost:${MCP_PORT}/health`);
  } else {
    console.log(`MCP Server:   🔴 Stopped`);
  }
  
  console.log('─'.repeat(40));
  console.log('\nLogs:');
  console.log(`  Proxy: ${PROXY_LOG}`);
  console.log(`  Docker: docker logs systemprompt-coding-agent-mcp-server-1`);
  console.log('\nTo stop services:');
  console.log('  npm run stop');
}

// Main function
async function main() {
  console.log('🚀 Starting Coding Agent services...\n');
  
  try {
    // Detect available tools
    console.log('🔍 Detecting available tools...');
    const tools = detectTools();
    
    // Write tool configuration to .env file for Docker
    const envContent = `
# Tool paths detected by start script
CLAUDE_PATH=${tools.CLAUDE_PATH || ''}
GEMINI_PATH=${tools.GEMINI_PATH || ''}
SHELL_PATH=${tools.SHELL_PATH}
CLAUDE_AVAILABLE=${tools.CLAUDE_AVAILABLE}
GEMINI_AVAILABLE=${tools.GEMINI_AVAILABLE}
`.trim();
    
    const envPath = path.join(process.cwd(), '.env.tools');
    fs.writeFileSync(envPath, envContent);
    console.log('✓ Tool configuration written to .env.tools');
    
    // Set environment variables for proxy
    process.env.CLAUDE_PATH = tools.CLAUDE_PATH || '';
    process.env.GEMINI_PATH = tools.GEMINI_PATH || '';
    process.env.SHELL_PATH = tools.SHELL_PATH;
    
    // Start proxy first (lightweight)
    await startProxy();
    
    // Then start Docker with tool configuration
    await startDocker();
    
    // Show final status
    showStatus();
    
    console.log('\n✅ All services started successfully!');
    
  } catch (error) {
    console.error('\n❌ Failed to start services:', error.message);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// Run main
main();