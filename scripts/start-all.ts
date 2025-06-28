#!/usr/bin/env node

/**
 * start-all.ts - Unified startup script
 * Validates environment, starts proxy, and launches Docker with validated env
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Types
interface ValidatedEnvironment {
  CLAUDE_PATH: string;
  SHELL_PATH: string;
  CLAUDE_AVAILABLE: string;
  CLAUDE_PROXY_HOST: string;
  CLAUDE_PROXY_PORT: string;
  MCP_PORT: string;
  HOST_FILE_ROOT: string;
  errors: string[];
}

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

class StartupManager {
  private proxyProcess: ChildProcess | null = null;
  private dockerProcess: ChildProcess | null = null;
  private logDir: string;
  
  constructor() {
    this.logDir = path.join(projectRoot, 'logs');
    this.ensureLogDirectory();
  }
  
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }
  
  private log(message: string, color: string = colors.reset): void {
    console.log(`${color}${message}${colors.reset}`);
  }
  
  private error(message: string): void {
    console.error(`${colors.red}ERROR: ${message}${colors.reset}`);
  }
  
  private success(message: string): void {
    this.log(`✓ ${message}`, colors.green);
  }
  
  private info(message: string): void {
    this.log(`ℹ ${message}`, colors.blue);
  }
  
  private warning(message: string): void {
    this.log(`⚠ ${message}`, colors.yellow);
  }
  
  async validateEnvironment(): Promise<ValidatedEnvironment> {
    this.log('\n==== Validating Environment ====\n', colors.blue);
    
    const errors: string[] = [];
    const env: ValidatedEnvironment = {
      CLAUDE_PATH: '',
      SHELL_PATH: '/bin/bash',
      CLAUDE_AVAILABLE: 'false',
      CLAUDE_PROXY_HOST: 'host.docker.internal',
      CLAUDE_PROXY_PORT: '9876',
      MCP_PORT: '3010',
      HOST_FILE_ROOT: projectRoot,
      errors: []
    };
    
    // Check Claude
    const claudeCommand = await this.findCommand('claude');
    if (claudeCommand) {
      env.CLAUDE_PATH = claudeCommand;
      env.CLAUDE_AVAILABLE = 'true';
      this.success(`Claude found at: ${claudeCommand}`);
    } else {
      errors.push('Claude CLI not found. Install from: https://github.com/anthropics/claude-cli');
      this.warning('Claude CLI not found');
    }
    
    // Check shell
    const shellPath = process.env.SHELL || '/bin/bash';
    if (fs.existsSync(shellPath)) {
      env.SHELL_PATH = shellPath;
      this.success(`Shell found at: ${shellPath}`);
    } else {
      env.SHELL_PATH = '/bin/bash';
      this.warning(`Shell ${shellPath} not found, using /bin/bash`);
    }
    
    // Check Docker
    const dockerCommand = await this.findCommand('docker');
    if (!dockerCommand) {
      errors.push('Docker not found. Docker is required to run the MCP server.');
    } else {
      this.success('Docker found');
    }
    
    // Check docker-compose
    const dockerComposeCommand = await this.findCommand('docker-compose');
    if (!dockerComposeCommand) {
      errors.push('docker-compose not found. Please install docker-compose.');
    } else {
      this.success('docker-compose found');
    }
    
    // Load .env if exists
    const envFile = path.join(projectRoot, '.env');
    if (fs.existsSync(envFile)) {
      this.info('Loading .env file');
      const envContent = fs.readFileSync(envFile, 'utf-8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          if (key.trim() in env) {
            (env as any)[key.trim()] = value.trim();
          }
        }
      });
    }
    
    env.errors = errors;
    
    if (errors.length > 0) {
      this.error('\nValidation failed:');
      errors.forEach(err => this.error(`  - ${err}`));
    } else {
      this.success('\nAll validations passed!');
    }
    
    return env;
  }
  
  private async findCommand(command: string): Promise<string | null> {
    return new Promise((resolve) => {
      const which = spawn('which', [command], { shell: true });
      let output = '';
      
      which.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      which.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve(output.trim());
        } else {
          resolve(null);
        }
      });
    });
  }
  
  async buildDaemon(): Promise<boolean> {
    this.log('\n==== Building Daemon ====\n', colors.blue);
    
    return new Promise((resolve) => {
      const build = spawn('npm', ['run', 'build'], {
        cwd: path.join(projectRoot, 'daemon'),
        stdio: 'inherit',
        shell: true
      });
      
      build.on('close', (code) => {
        if (code === 0) {
          this.success('Daemon built successfully');
          resolve(true);
        } else {
          this.error('Failed to build daemon');
          resolve(false);
        }
      });
    });
  }
  
  async startProxy(env: ValidatedEnvironment): Promise<boolean> {
    this.log('\n==== Starting Proxy ====\n', colors.blue);
    
    // Kill any existing proxy
    await this.killExistingProxy();
    
    const proxyEnv = {
      ...process.env,
      CLAUDE_PATH: env.CLAUDE_PATH,
      SHELL_PATH: env.SHELL_PATH,
      CLAUDE_AVAILABLE: env.CLAUDE_AVAILABLE,
      CLAUDE_PROXY_PORT: env.CLAUDE_PROXY_PORT
    };
    
    const logFile = path.join(this.logDir, 'host-bridge.log');
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    this.proxyProcess = spawn('node', ['dist/host-bridge-daemon.js'], {
      cwd: path.join(projectRoot, 'daemon'),
      env: proxyEnv,
      detached: true,
      stdio: ['ignore', logStream, logStream],
      shell: true
    });
    
    // Save PID
    const pidFile = path.join(this.logDir, 'proxy.pid');
    fs.writeFileSync(pidFile, this.proxyProcess.pid!.toString());
    
    this.info(`Proxy started with PID: ${this.proxyProcess.pid}`);
    this.info(`Log file: ${logFile}`);
    
    // Wait for proxy to be ready
    await this.waitForPort(parseInt(env.CLAUDE_PROXY_PORT), 10);
    
    return true;
  }
  
  private async killExistingProxy(): Promise<void> {
    const pidFile = path.join(this.logDir, 'proxy.pid');
    if (fs.existsSync(pidFile)) {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8'));
      try {
        process.kill(pid, 'SIGTERM');
        this.info(`Killed existing proxy (PID: ${pid})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        // Process doesn't exist
      }
      fs.unlinkSync(pidFile);
    }
  }
  
  private async waitForPort(port: number, maxAttempts: number): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isPortOpen(port)) {
        this.success(`Proxy is listening on port ${port}`);
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    this.error(`Daemon failed to start on port ${port}`);
    return false;
  }
  
  private isPortOpen(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
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
  
  async startDocker(env: ValidatedEnvironment): Promise<boolean> {
    this.log('\n==== Starting Docker Services ====\n', colors.blue);
    
    const dockerEnv = {
      ...process.env,
      ...env,
      // Remove 'errors' from env
      errors: undefined
    };
    
    // Write environment to .env file for docker-compose
    const envContent = Object.entries(dockerEnv)
      .filter(([key, value]) => value !== undefined && key !== 'errors')
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync(path.join(projectRoot, '.env'), envContent);
    
    return new Promise((resolve) => {
      this.dockerProcess = spawn('docker-compose', ['up', '-d'], {
        cwd: projectRoot,
        stdio: 'inherit',
        env: dockerEnv,
        shell: true
      });
      
      this.dockerProcess.on('close', (code) => {
        if (code === 0) {
          this.success('Docker services started');
          resolve(true);
        } else {
          this.error('Failed to start Docker services');
          resolve(false);
        }
      });
    });
  }
  
  async start(): Promise<void> {
    try {
      // Validate environment
      const env = await this.validateEnvironment();
      
      if (env.errors.length > 0) {
        this.error('\nCannot start due to validation errors');
        process.exit(1);
      }
      
      // Build daemon
      if (!await this.buildDaemon()) {
        this.error('Failed to build daemon');
        process.exit(1);
      }
      
      // Start proxy
      if (!await this.startProxy(env)) {
        this.error('Failed to start proxy');
        process.exit(1);
      }
      
      // Start Docker
      if (!await this.startDocker(env)) {
        this.error('Failed to start Docker services');
        process.exit(1);
      }
      
      this.log('\n==== All Services Started Successfully! ====\n', colors.green);
      this.info('Quick commands:');
      this.info('  View proxy logs: npm run proxy:logs');
      this.info('  View Docker logs: npm run docker:logs');
      this.info('  Run tests: npm test');
      this.info('  Stop all: npm run stop:all');
      
      // Detach from child processes
      if (this.proxyProcess) {
        this.proxyProcess.unref();
      }
      
    } catch (error) {
      this.error(`Startup failed: ${error}`);
      process.exit(1);
    }
  }
}

// Main
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manager = new StartupManager();
  manager.start();
}