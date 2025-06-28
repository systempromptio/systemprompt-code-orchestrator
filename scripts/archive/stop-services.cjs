#!/usr/bin/env node

/**
 * Stop Services Script
 * Gracefully stops Docker container and Claude host proxy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logsDir = path.join(process.cwd(), 'logs');
const pidFile = path.join(logsDir, 'proxy.pid');

// Stop proxy
function stopProxy() {
  console.log('Stopping Claude host proxy...');
  
  try {
    // Try to kill by PID file first
    if (fs.existsSync(pidFile)) {
      const pid = fs.readFileSync(pidFile, 'utf8').trim();
      try {
        process.kill(parseInt(pid, 10), 'SIGTERM');
        fs.unlinkSync(pidFile);
        console.log('✓ Claude host proxy stopped');
      } catch (e) {
        if (e.code !== 'ESRCH') { // Process doesn't exist
          throw e;
        }
      }
    }
    
    // Also try to kill by name as fallback
    try {
      execSync('pkill -f "claude-host-proxy-streaming.cjs"', { stdio: 'ignore' });
    } catch {
      // Ignore errors - process might not exist
    }
    
  } catch (error) {
    console.error('Warning: Could not stop proxy:', error.message);
  }
}

// Stop Docker
function stopDocker() {
  console.log('Stopping Docker services...');
  
  try {
    execSync('docker-compose down', {
      stdio: 'inherit'
    });
    console.log('✓ Docker services stopped');
  } catch (error) {
    console.error('Failed to stop Docker services:', error.message);
  }
}

// Main
console.log('🛑 Stopping Coding Agent services...\n');

stopProxy();
stopDocker();

console.log('\n✅ All services stopped');