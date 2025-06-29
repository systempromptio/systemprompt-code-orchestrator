#!/usr/bin/env node

/**
 * @file Run E2E tests with automatic tunnel setup
 * @module run-with-tunnel
 * 
 * @remarks
 * This script automatically starts a tunnel if not already running
 * and runs the e2e tests through the tunnel
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

async function checkExistingTunnel(): Promise<string | null> {
  const tunnelFile = path.join(projectRoot, '.tunnel-url');
  if (fs.existsSync(tunnelFile)) {
    const url = fs.readFileSync(tunnelFile, 'utf8').trim();
    // Verify tunnel is still active by checking if cloudflared is running
    try {
      const { execSync } = await import('child_process');
      execSync('pgrep cloudflared', { stdio: 'ignore' });
      return url;
    } catch {
      // Process not found, tunnel is not running
      fs.unlinkSync(tunnelFile);
    }
  }
  return null;
}

async function startTunnel(): Promise<string> {
  log('🚀 Starting Cloudflare tunnel...', colors.blue);
  
  return new Promise((resolve, reject) => {
    const tunnelProcess = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:3000'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let resolved = false;
    
    const handleOutput = (data: Buffer) => {
      const text = data.toString();
      const urlMatch = text.match(/https:\/\/[^\s]+\.trycloudflare\.com/);
      if (urlMatch && !resolved) {
        resolved = true;
        const url = urlMatch[0];
        
        // Save to file
        fs.writeFileSync(path.join(projectRoot, '.tunnel-url'), url);
        
        log(`✅ Tunnel established: ${url}`, colors.green);
        
        // Detach the process so it continues running
        tunnelProcess.unref();
        
        resolve(url);
      }
    };
    
    tunnelProcess.stdout.on('data', handleOutput);
    tunnelProcess.stderr.on('data', handleOutput);
    
    tunnelProcess.on('error', (error) => {
      if (!resolved) {
        reject(error);
      }
    });
    
    setTimeout(() => {
      if (!resolved) {
        tunnelProcess.kill();
        reject(new Error('Timeout waiting for tunnel URL'));
      }
    }, 30000);
  });
}

async function runTests(tunnelUrl: string): Promise<void> {
  log(`\n🧪 Running E2E tests through tunnel...`, colors.blue);
  log(`📡 Tunnel URL: ${colors.cyan}${tunnelUrl}${colors.reset}\n`);
  
  return new Promise((resolve, reject) => {
    const testProcess = spawn('npm', ['test'], {
      cwd: __dirname,
      stdio: 'inherit',
      env: {
        ...process.env,
        MCP_BASE_URL: tunnelUrl,
        TUNNEL_MODE: 'true',
        TUNNEL_URL: tunnelUrl
      }
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });
    
    testProcess.on('error', reject);
  });
}

async function main() {
  try {
    // Check if server is running
    try {
      const response = await fetch('http://localhost:3000/health');
      if (!response.ok) {
        throw new Error('Server not healthy');
      }
    } catch {
      log('❌ MCP server is not running!', colors.red);
      log('Please start the server first: npm start', colors.yellow);
      process.exit(1);
    }
    
    // Check for existing tunnel
    let tunnelUrl = await checkExistingTunnel();
    
    if (tunnelUrl) {
      log(`✅ Using existing tunnel: ${tunnelUrl}`, colors.green);
    } else {
      // Start new tunnel
      tunnelUrl = await startTunnel();
    }
    
    // Run tests
    await runTests(tunnelUrl);
    
    log('\n✅ All tests completed successfully!', colors.green);
    
  } catch (error: any) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { checkExistingTunnel, startTunnel, runTests };