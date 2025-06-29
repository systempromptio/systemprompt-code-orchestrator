#!/usr/bin/env node

/**
 * @file Check tunnel status
 * @module scripts/tunnel-status
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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

function checkTunnelStatus(): void {
  console.log('🔍 Tunnel Status Check\n');
  
  // Check for tunnel URL file
  const tunnelFile = path.join(projectRoot, '.tunnel-url');
  
  if (fs.existsSync(tunnelFile)) {
    const url = fs.readFileSync(tunnelFile, 'utf8').trim();
    
    // Check if cloudflared process is running
    let processRunning = false;
    try {
      execSync('pgrep cloudflared', { stdio: 'ignore' });
      processRunning = true;
    } catch {
      processRunning = false;
    }
    
    if (processRunning) {
      log('✅ Tunnel is ACTIVE', colors.green);
      log(`🌍 Public URL: ${colors.cyan}${url}${colors.reset}`);
      log(`📡 MCP Endpoint: ${colors.cyan}${url}/mcp${colors.reset}`);
      
      console.log('\nTo use this tunnel:');
      console.log(`  1. In tests: ${colors.yellow}MCP_BASE_URL="${url}" npm test${colors.reset}`);
      console.log(`  2. Auto-detect: ${colors.yellow}cd e2e-test && npm run test:tunnel${colors.reset}`);
      console.log(`  3. From root: ${colors.yellow}npm run test:tunnel${colors.reset}`);
      
      // Test connectivity
      console.log('\n🔗 Testing connectivity...');
      fetch(`${url}/health`)
        .then(res => {
          if (res.ok) {
            log('✅ Tunnel is accessible and working!', colors.green);
          } else {
            log(`⚠️  Tunnel returned status ${res.status}`, colors.yellow);
          }
        })
        .catch(err => {
          log('❌ Cannot connect to tunnel', colors.red);
          console.log(`   Error: ${err.message}`);
        });
        
    } else {
      log('⚠️  Tunnel URL found but cloudflared is not running', colors.yellow);
      log(`   Stale URL: ${url}`, colors.yellow);
      console.log('\nCleaning up stale tunnel file...');
      fs.unlinkSync(tunnelFile);
      log('✅ Cleaned up', colors.green);
    }
  } else {
    log('❌ No tunnel is currently running', colors.red);
    
    console.log('\nTo start a tunnel:');
    console.log(`  1. Manual: ${colors.yellow}npm run tunnel${colors.reset}`);
    console.log(`  2. With test: ${colors.yellow}npm run test:tunnel${colors.reset}`);
    console.log(`  3. Just tunnel: ${colors.yellow}cloudflared tunnel --url http://localhost:3000${colors.reset}`);
  }
  
  // Check if server is running
  console.log('\n🔍 Server Status:');
  fetch('http://localhost:3000/health')
    .then(res => {
      if (res.ok) {
        log('✅ MCP server is running on port 3000', colors.green);
      } else {
        log(`⚠️  Server returned status ${res.status}`, colors.yellow);
      }
    })
    .catch(() => {
      log('❌ MCP server is not running', colors.red);
      console.log(`   Start it with: ${colors.yellow}npm start${colors.reset}`);
    });
}

// Run the check
checkTunnelStatus();