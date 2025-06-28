#!/usr/bin/env node

/**
 * Daemon Control Script - TypeScript Version
 * Manages the Host Bridge Daemon that connects Docker to host CLI tools
 */

import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { spawn, execSync, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

interface DaemonConfig {
  port: number;
  daemonScript: string;
  pidFile: string;
  logFile: string;
  logsDir: string;
}

class DaemonController {
  private config: DaemonConfig;

  constructor() {
    const logsDir = path.join(projectRoot, 'logs');
    
    this.config = {
      port: parseInt(process.env.HOST_BRIDGE_DAEMON_PORT || '9876', 10),
      daemonScript: path.join(projectRoot, 'daemon', 'dist', 'host-bridge-daemon.js'),
      pidFile: path.join(logsDir, 'daemon.pid'),
      logFile: path.join(logsDir, 'host-bridge.log'),
      logsDir
    };

    // Ensure logs directory exists
    if (!fs.existsSync(this.config.logsDir)) {
      fs.mkdirSync(this.config.logsDir, { recursive: true });
    }
  }

  private log(message: string, color: string = colors.reset): void {
    console.log(`${color}${message}${colors.reset}`);
  }

  private error(message: string): void {
    console.error(`${colors.red}ERROR: ${message}${colors.reset}`);
  }

  private warning(message: string): void {
    this.log(`WARNING: ${message}`, colors.yellow);
  }

  private success(message: string): void {
    this.log(`✓ ${message}`, colors.green);
  }

  private info(message: string): void {
    this.log(`ℹ ${message}`, colors.blue);
  }

  header(message: string): void {
    this.log(`\n==== ${message} ====\n`, colors.blue);
  }

  private isDaemonRunning(): boolean {
    if (fs.existsSync(this.config.pidFile)) {
      const pid = parseInt(fs.readFileSync(this.config.pidFile, 'utf-8'));
      try {
        // Check if process exists
        process.kill(pid, 0);
        return true;
      } catch {
        // Process doesn't exist
        return false;
      }
    }
    return false;
  }

  private getDaemonPid(): number | null {
    if (fs.existsSync(this.config.pidFile)) {
      return parseInt(fs.readFileSync(this.config.pidFile, 'utf-8'));
    }
    
    // Fallback: try to find process
    try {
      const result = execSync(`pgrep -f "${this.config.daemonScript}"`, { encoding: 'utf-8' });
      const pids = result.trim().split('\n');
      return pids[0] ? parseInt(pids[0]) : null;
    } catch {
      return null;
    }
  }

  private async isPortOpen(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      
      client.setTimeout(1000);
      client.on('connect', () => {
        client.destroy();
        resolve(true);
      });
      
      client.on('error', () => {
        resolve(false);
      });
      
      client.on('timeout', () => {
        client.destroy();
        resolve(false);
      });
      
      client.connect(port, 'localhost');
    });
  }

  async stop(): Promise<void> {
    if (this.isDaemonRunning()) {
      const pid = this.getDaemonPid();
      if (pid) {
        this.info(`Stopping daemon (PID: ${pid})...`);
        
        try {
          process.kill(pid, 'SIGTERM');
          
          // Wait for process to stop
          let count = 0;
          while (count < 10) {
            try {
              process.kill(pid, 0);
              await new Promise(resolve => setTimeout(resolve, 1000));
              count++;
            } catch {
              // Process stopped
              break;
            }
          }
          
          // Force kill if still running
          try {
            process.kill(pid, 0);
            this.warning('Force killing daemon...');
            process.kill(pid, 'SIGKILL');
          } catch {
            // Process already stopped
          }
        } catch (err) {
          // Process doesn't exist
        }
        
        fs.unlinkSync(this.config.pidFile);
        this.success('Daemon stopped');
      }
    } else {
      this.info('Daemon is not running');
    }
  }

  async start(): Promise<boolean> {
    if (this.isDaemonRunning()) {
      const pid = this.getDaemonPid();
      this.warning(`Daemon is already running (PID: ${pid})`);
      return true;
    }

    // Check if daemon script exists
    if (!fs.existsSync(this.config.daemonScript)) {
      this.error(`Daemon script not found: ${this.config.daemonScript}`);
      this.info('Run "npm run build:daemon" to build the daemon');
      return false;
    }

    // Set up environment
    const env = {
      ...process.env,
      CLAUDE_PATH: process.env.CLAUDE_PATH || execSync('which claude 2>/dev/null || echo ""', { encoding: 'utf-8' }).trim(),
      GEMINI_PATH: process.env.GEMINI_PATH || execSync('which gemini 2>/dev/null || echo ""', { encoding: 'utf-8' }).trim(),
      SHELL_PATH: process.env.SHELL_PATH || '/bin/bash',
      CLAUDE_AVAILABLE: process.env.CLAUDE_AVAILABLE || 'false',
      HOST_BRIDGE_DAEMON_PORT: this.config.port.toString()
    };

    this.info(`Starting daemon on port ${this.config.port}...`);
    this.info(`Claude path: ${env.CLAUDE_PATH || 'not found'}`);
    this.info(`Gemini path: ${env.GEMINI_PATH || 'not found'}`);
    this.info(`Log file: ${this.config.logFile}`);

    // Start daemon
    const out = fs.openSync(this.config.logFile, 'a');
    const err = fs.openSync(this.config.logFile, 'a');
    
    const daemon = spawn('node', [this.config.daemonScript], {
      detached: true,
      stdio: ['ignore', out, err],
      env
    });

    if (!daemon.pid) {
      this.error('Failed to start daemon');
      return false;
    }

    // Save PID
    fs.writeFileSync(this.config.pidFile, daemon.pid.toString());
    
    // Detach from parent
    daemon.unref();

    // Wait for daemon to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if daemon started successfully
    if (this.isDaemonRunning() && await this.isPortOpen(this.config.port)) {
      this.success(`Daemon started successfully (PID: ${daemon.pid})`);
      this.info(`Listening on port ${this.config.port}`);
      return true;
    } else {
      this.error('Failed to start daemon');
      fs.unlinkSync(this.config.pidFile);
      this.info(`Check logs at: ${this.config.logFile}`);
      
      // Show recent logs
      const logs = fs.readFileSync(this.config.logFile, 'utf-8');
      const lines = logs.split('\n');
      const recentLogs = lines.slice(-20).join('\n');
      console.log(recentLogs);
      
      return false;
    }
  }

  async restart(): Promise<boolean> {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await this.start();
  }

  async status(): Promise<void> {
    this.header('Daemon Status');

    if (this.isDaemonRunning()) {
      const pid = this.getDaemonPid();
      this.success(`Daemon is running (PID: ${pid})`);

      // Check if port is listening
      if (await this.isPortOpen(this.config.port)) {
        this.success(`Listening on port ${this.config.port}`);
      } else {
        this.warning(`Process running but not listening on port ${this.config.port}`);
      }

      // Show recent logs
      if (fs.existsSync(this.config.logFile)) {
        this.log('\nRecent logs:', colors.blue);
        const logs = fs.readFileSync(this.config.logFile, 'utf-8');
        const lines = logs.split('\n');
        const recentLogs = lines.slice(-5).join('\n');
        console.log(recentLogs);
      }
    } else {
      this.info('Daemon is not running');
    }
  }

  logs(): void {
    if (fs.existsSync(this.config.logFile)) {
      const tail = spawn('tail', ['-f', this.config.logFile], {
        stdio: 'inherit'
      });

      process.on('SIGINT', () => {
        tail.kill('SIGINT');
        process.exit(0);
      });
    } else {
      this.error(`Log file not found: ${this.config.logFile}`);
    }
  }

  showUsage(): void {
    console.log('Usage: daemon-control {start|stop|restart|status|logs}');
    console.log('');
    console.log('Commands:');
    console.log('  start    - Start the daemon');
    console.log('  stop     - Stop the daemon');
    console.log('  restart  - Restart the daemon');
    console.log('  status   - Show daemon status');
    console.log('  logs     - Follow daemon logs');
  }
}

// Main entry point
async function main() {
  const controller = new DaemonController();
  const command = process.argv[2] || 'start';

  switch (command) {
    case 'start':
      controller.header('Starting Host Bridge Daemon');
      const started = await controller.start();
      process.exit(started ? 0 : 1);
      break;

    case 'stop':
      controller.header('Stopping Host Bridge Daemon');
      await controller.stop();
      break;

    case 'restart':
      controller.header('Restarting Host Bridge Daemon');
      const restarted = await controller.restart();
      process.exit(restarted ? 0 : 1);
      break;

    case 'status':
      await controller.status();
      break;

    case 'logs':
      controller.logs();
      break;

    default:
      controller.showUsage();
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

export { DaemonController };