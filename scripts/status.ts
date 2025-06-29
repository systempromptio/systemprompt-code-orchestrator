#!/usr/bin/env node

/**
 * System Status Script
 * Shows the health and status of all services
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

class SystemStatus {
  private log(message: string, color: string = colors.reset): void {
    console.log(`${color}${message}${colors.reset}`);
  }
  
  private success(message: string): void {
    this.log(`✓ ${message}`, colors.green);
  }
  
  private error(message: string): void {
    this.log(`✗ ${message}`, colors.red);
  }
  
  private warning(message: string): void {
    this.log(`⚠ ${message}`, colors.yellow);
  }
  
  private info(message: string): void {
    this.log(`ℹ ${message}`, colors.blue);
  }
  
  private header(title: string): void {
    this.log(`\n==== ${title} ====\n`, colors.blue);
  }
  
  checkDaemonStatus(): { running: boolean; pid?: number; port?: number } {
    this.header('Host Bridge Daemon Status');
    
    const pidFile = path.join(projectRoot, 'daemon', 'logs', 'daemon.pid');
    
    if (!fs.existsSync(pidFile)) {
      this.error('Daemon is not running (no PID file)');
      return { running: false };
    }
    
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8'));
      
      // Check if process exists
      try {
        execSync(`ps -p ${pid}`, { stdio: 'pipe' });
        this.success(`Daemon is running (PID: ${pid})`);
        
        // Check if port is listening
        try {
          execSync(`lsof -i :9876 -P -n | grep LISTEN`, { stdio: 'pipe' });
          this.success('Listening on port 9876');
          
          // Check daemon logs
          const logFile = path.join(projectRoot, 'daemon', 'logs', 'host-bridge.log');
          if (fs.existsSync(logFile)) {
            const stats = fs.statSync(logFile);
            const lastModified = new Date(stats.mtime);
            const minutesAgo = Math.floor((Date.now() - lastModified.getTime()) / 1000 / 60);
            this.info(`Log file last updated: ${minutesAgo} minutes ago`);
          }
          
          return { running: true, pid, port: 9876 };
        } catch {
          this.warning('Daemon process exists but not listening on port 9876');
          return { running: true, pid };
        }
      } catch {
        this.error(`Daemon PID ${pid} is not running`);
        return { running: false };
      }
    } catch (error) {
      this.error('Failed to read daemon PID file');
      return { running: false };
    }
  }
  
  checkDockerStatus(): { running: boolean; containers?: string[] } {
    this.header('Docker Services Status');
    
    try {
      // Check if Docker is running
      execSync('docker info', { stdio: 'pipe' });
      
      // Check our containers
      const containers = execSync('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep systemprompt || true', { 
        encoding: 'utf-8' 
      }).trim();
      
      if (!containers) {
        this.error('No Docker containers running');
        return { running: false };
      }
      
      const lines = containers.split('\n');
      const runningContainers: string[] = [];
      
      lines.forEach(line => {
        if (line.includes('mcp-server')) {
          if (line.includes('Up')) {
            this.success('MCP Server container is running');
            if (line.includes('3000')) {
              this.success('  → Exposed on port 3000');
            }
            runningContainers.push('mcp-server');
          } else {
            this.error('MCP Server container is not healthy');
          }
        }
        
        if (line.includes('cloudflared')) {
          if (line.includes('Up')) {
            this.info('Cloudflare tunnel is running');
            runningContainers.push('cloudflared');
          }
        }
      });
      
      // Check Docker logs for recent activity
      try {
        const recentLogs = execSync('docker logs systemprompt-coding-agent-mcp-server-1 --tail 1 2>&1', {
          encoding: 'utf-8'
        }).trim();
        
        if (recentLogs) {
          this.info('Recent Docker log: ' + recentLogs.substring(0, 80) + '...');
        }
      } catch {
        // Ignore log errors
      }
      
      return { running: runningContainers.length > 0, containers: runningContainers };
    } catch {
      this.error('Docker is not running or not accessible');
      return { running: false };
    }
  }
  
  checkServiceConnectivity(): void {
    this.header('Service Connectivity');
    
    // Check if MCP server responds
    try {
      execSync('curl -s http://localhost:3000/health || curl -s http://localhost:3000/', { 
        timeout: 5000,
        stdio: 'pipe'
      });
      this.success('MCP Server is responding on http://localhost:3000');
    } catch {
      this.warning('MCP Server is not responding on port 3000');
    }
    
    // Check daemon connectivity from host
    try {
      execSync('nc -zv localhost 9876', { 
        timeout: 2000,
        stdio: 'pipe'
      });
      this.success('Host Bridge Daemon is accessible on localhost:9876');
    } catch {
      this.warning('Host Bridge Daemon is not accessible');
    }
  }
  
  checkEnvironment(): void {
    this.header('Environment Check');
    
    // Check .env file
    const envFile = path.join(projectRoot, '.env');
    if (fs.existsSync(envFile)) {
      this.success('.env file exists');
      
      const env = fs.readFileSync(envFile, 'utf-8');
      if (env.includes('CLAUDE_PATH=')) {
        const claudePath = env.match(/CLAUDE_PATH=([^\n]+)/)?.[1];
        if (claudePath && fs.existsSync(claudePath)) {
          this.success(`Claude CLI configured: ${claudePath}`);
        } else {
          this.warning('Claude CLI path configured but not found');
        }
      }
      
      if (env.includes('HOST_FILE_ROOT=')) {
        this.success('HOST_FILE_ROOT is configured');
      } else {
        this.warning('HOST_FILE_ROOT is not set in .env');
      }
    } else {
      this.error('.env file not found - run npm setup');
    }
    
    // Check Node version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    if (majorVersion >= 18) {
      this.info(`Node.js ${nodeVersion}`);
    } else {
      this.error(`Node.js ${nodeVersion} (18+ required)`);
    }
  }
  
  showSummary(daemonStatus: any, dockerStatus: any): void {
    this.header('Summary');
    
    const allGood = daemonStatus.running && daemonStatus.port && dockerStatus.running;
    
    if (allGood) {
      this.success('All systems operational! 🚀');
      this.log('\nQuick commands:', colors.gray);
      this.log('  npm test         # Run tests', colors.gray);
      this.log('  npm run logs     # View logs', colors.gray);
      this.log('  npm stop         # Stop everything', colors.gray);
    } else {
      this.warning('Some services are not running');
      this.log('\nTo start all services:', colors.gray);
      this.log('  npm start', colors.gray);
      
      if (!daemonStatus.running) {
        this.log('\nTo start just the daemon:', colors.gray);
        this.log('  npm run daemon:start', colors.gray);
      }
      
      if (!dockerStatus.running) {
        this.log('\nTo start just Docker:', colors.gray);
        this.log('  npm run docker:up', colors.gray);
      }
    }
  }
  
  async run(): Promise<void> {
    this.log('System Status Report', colors.green);
    this.log('=' . repeat(50), colors.green);
    
    const daemonStatus = this.checkDaemonStatus();
    const dockerStatus = this.checkDockerStatus();
    this.checkServiceConnectivity();
    this.checkEnvironment();
    this.showSummary(daemonStatus, dockerStatus);
  }
}

// Main entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const status = new SystemStatus();
  status.run().catch(error => {
    console.error('Status check failed:', error);
    process.exit(1);
  });
}