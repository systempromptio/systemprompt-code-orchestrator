#!/usr/bin/env node

/**
 * start-all.ts - Unified startup script
 * Validates environment, starts proxy, and launches Docker with validated env
 */

import { ChildProcess, spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import * as net from 'net';

const execAsync = promisify(exec);

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

// Types
interface ValidatedEnvironment {
  CLAUDE_PATH: string;
  GEMINI_PATH: string;
  SHELL_PATH: string;
  CLAUDE_AVAILABLE: string;
  GEMINI_AVAILABLE: string;
  CLAUDE_PROXY_HOST: string;
  CLAUDE_PROXY_PORT: string;
  MCP_PORT: string;
  HOST_FILE_ROOT: string;
  GIT_AVAILABLE: string;
  GIT_CURRENT_BRANCH: string;
  TUNNEL_URL?: string;
  TUNNEL_ENABLED?: string;
  PUBLIC_URL?: string;
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
      GIT_AVAILABLE: 'false',
      GIT_CURRENT_BRANCH: 'none',
      errors: []
    } as any;
    
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
    
    // Check git repository status
    try {
      const { stdout } = await execAsync('git rev-parse --is-inside-work-tree', { cwd: projectRoot });
      if (stdout.trim() === 'true') {
        this.success(`Git repository found at: ${projectRoot}`);
        env.GIT_AVAILABLE = 'true';
        
        // Get current branch
        const { stdout: branchOut } = await execAsync('git branch --show-current', { cwd: projectRoot });
        env.GIT_CURRENT_BRANCH = branchOut.trim() || 'main';
        this.info(`Current git branch: ${env.GIT_CURRENT_BRANCH}`);
      }
    } catch (e) {
      this.warning('Not a git repository - git operations will be disabled');
      env.GIT_AVAILABLE = 'false';
      env.GIT_CURRENT_BRANCH = 'none';
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
    
    // Check for tunnel environment variables
    if (process.env.TUNNEL_URL) {
      env.TUNNEL_URL = process.env.TUNNEL_URL;
      env.TUNNEL_ENABLED = 'true';
      env.PUBLIC_URL = process.env.TUNNEL_URL;
      this.success(`Using tunnel URL: ${env.TUNNEL_URL}`);
    } else if (process.env.TUNNEL_ENABLED === 'true') {
      this.info('Tunnel enabled but no URL provided yet');
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
      const isWindows = process.platform === 'win32';
      const shellCommand = isWindows ? 'where' : 'which';
      const which = spawn(shellCommand, [command], { shell: isWindows });
      let output = '';
      
      which.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      
      which.on('close', (code: number | null) => {
        if (code === 0 && output.trim()) {
          // On Windows, 'where' might return multiple lines
          const firstLine = output.trim().split('\n')[0].trim();
          resolve(firstLine);
        } else {
          resolve(null);
        }
      });
    });
  }
  
  async buildDaemon(): Promise<boolean> {
    this.log('\n==== Building Daemon ====\n', colors.blue);
    
    try {
      await execAsync('npm run build', {
        cwd: path.join(projectRoot, 'daemon'),
        shell: '/bin/bash'
      });
      this.success('Daemon built successfully');
      return true;
    } catch (error) {
      this.error(`Failed to build daemon: ${error}`);
      return false;
    }
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
      GEMINI_AVAILABLE: env.GEMINI_AVAILABLE || 'false',
      CLAUDE_PROXY_PORT: env.CLAUDE_PROXY_PORT
    };
    
    // Daemon manages its own logs in daemon/logs/
    const daemonDir = path.join(projectRoot, 'daemon');
    const daemonLogsDir = path.join(daemonDir, 'logs');
    
    // Ensure daemon logs directory exists
    if (!fs.existsSync(daemonLogsDir)) {
      fs.mkdirSync(daemonLogsDir, { recursive: true });
    }
    
    this.proxyProcess = spawn('node', ['dist/host-bridge-daemon.js'], {
      cwd: daemonDir,
      env: proxyEnv,
      detached: true,
      stdio: 'ignore'
    });
    
    if (!this.proxyProcess) {
      this.error('Failed to spawn proxy process');
      return false;
    }
    
    // Daemon will write its own PID to daemon/logs/daemon.pid
    this.info(`Daemon process spawned with PID: ${this.proxyProcess.pid}`);
    this.info(`Log file: ${path.join(daemonLogsDir, 'host-bridge.log')}`);
    
    // Detach the process so it runs independently
    this.proxyProcess.unref();
    
    // Wait for daemon to be ready
    const portReady = await this.waitForPort(parseInt(env.CLAUDE_PROXY_PORT), 10);
    
    if (!portReady) {
      // Check if the process is still running
      try {
        process.kill(this.proxyProcess.pid as number, 0);
        this.error('Daemon process is running but not listening on the expected port');
        this.error(`Check the log file: ${path.join(daemonLogsDir, 'host-bridge.log')}`);
      } catch (e) {
        this.error('Daemon process died during startup');
      }
      return false;
    }
    
    this.success(`Proxy is running on port ${env.CLAUDE_PROXY_PORT}`);
    return true;
  }
  
  private async killExistingProxy(): Promise<void> {
    // Only check in the daemon logs directory
    const pidFile = path.join(projectRoot, 'daemon', 'logs', 'daemon.pid');
    
    if (fs.existsSync(pidFile)) {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8'));
      try {
        process.kill(pid, 'SIGTERM');
        this.info(`Killed existing daemon (PID: ${pid})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        // Process doesn't exist, remove stale PID file
      }
      fs.unlinkSync(pidFile);
    }
  }
  
  private async waitForPort(port: number, maxAttempts: number): Promise<boolean> {
    // Give the daemon a moment to start up before checking
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isPortOpen(port)) {
        this.success(`Daemon is listening on port ${port}`);
        return true;
      }
      this.info(`Waiting for daemon to start... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    this.error(`Daemon failed to start on port ${port}`);
    return false;
  }
  
  private isPortOpen(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      
      client.setTimeout(1000);
      client.once('connect', () => {
        client.destroy();
        resolve(true);
      });
      
      client.once('error', () => {
        client.destroy();
        resolve(false);
      });
      
      client.once('timeout', () => {
        client.destroy();
        resolve(false);
      });
      
      // Connect to localhost (127.0.0.1)
      client.connect(port, '127.0.0.1');
    });
  }
  
  private async performPreChecks(env: ValidatedEnvironment): Promise<boolean> {
    this.log('\n==== Pre-flight Checks ====\n', colors.blue);
    let allChecksPass = true;
    
    // Check if daemon build exists
    const daemonPath = path.join(projectRoot, 'daemon', 'dist', 'host-bridge-daemon.js');
    this.info(`Checking for daemon at: ${daemonPath}`);
    if (!fs.existsSync(daemonPath)) {
      this.warning('Daemon not built yet - will build during startup');
    } else {
      this.success('Daemon build found');
    }
    
    // Check if ports are available
    if (await this.isPortOpen(parseInt(env.CLAUDE_PROXY_PORT))) {
      this.error(`Port ${env.CLAUDE_PROXY_PORT} is already in use`);
      const pidFile = path.join(projectRoot, 'daemon', 'logs', 'daemon.pid');
      if (fs.existsSync(pidFile)) {
        const pid = fs.readFileSync(pidFile, 'utf-8').trim();
        this.info(`  Found daemon PID file with PID: ${pid}`);
        this.info(`  Run "npm run stop" to stop existing services`);
      }
      allChecksPass = false;
    } else {
      this.success(`Port ${env.CLAUDE_PROXY_PORT} is available`);
    }
    
    if (await this.isPortOpen(parseInt(env.MCP_PORT))) {
      this.warning(`Port ${env.MCP_PORT} is in use (likely Docker services already running)`);
    } else {
      this.success(`Port ${env.MCP_PORT} is available`);
    }
    
    // Check Docker daemon
    try {
      await execAsync('docker info', { timeout: 5000 });
      this.success('Docker daemon is running');
    } catch {
      this.error('Docker daemon is not running');
      this.info('  Start Docker Desktop or run: sudo systemctl start docker');
      allChecksPass = false;
    }
    
    // Check if we need to set up Claude
    if (env.CLAUDE_AVAILABLE === 'false') {
      this.warning('Claude CLI not configured');
      this.info('  The daemon will start but won\'t be able to execute Claude commands');
      this.info('  To enable Claude: export CLAUDE_PATH=$(which claude)');
    }
    
    // Check write permissions
    try {
      const testFile = path.join(this.logDir, '.test-write');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      this.success('Write permissions verified');
    } catch {
      this.error('No write permissions in logs directory');
      allChecksPass = false;
    }
    
    return allChecksPass;
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
    
    try {
      // Check if we should skip the build (for development)
      const skipBuild = process.env.SKIP_DOCKER_BUILD === 'true';
      
      if (!skipBuild) {
        // Rebuild the Docker image to ensure latest code
        this.info('Building Docker image with latest code...');
        this.info('(Set SKIP_DOCKER_BUILD=true to skip this step)');
        await execAsync('docker-compose build mcp-server', {
          cwd: projectRoot,
          env: dockerEnv,
          shell: '/bin/bash'
        });
        this.success('Docker image built with latest code');
      } else {
        this.warning('Skipping Docker build (SKIP_DOCKER_BUILD=true)');
      }
      
      // Now start the services
      this.info('Starting Docker services...');
      await execAsync('docker-compose up -d', {
        cwd: projectRoot,
        env: dockerEnv,
        shell: '/bin/bash'
      });
      this.success('Docker services started');
      return true;
    } catch (error) {
      this.error(`Failed to start Docker services: ${error}`);
      return false;
    }
  }
  
  async start(): Promise<void> {
    try {
      // Validate environment
      const env = await this.validateEnvironment();
      
      if (env.errors.length > 0) {
        this.error('\nCannot start due to validation errors');
        this.error('\nPlease fix the following issues:');
        env.errors.forEach(err => this.error(`  • ${err}`));
        this.info('\nRun "npm run setup" to configure your environment');
        process.exit(1);
      }
      
      // Additional pre-checks
      if (!await this.performPreChecks(env)) {
        this.error('\nPre-flight checks failed. Cannot continue.');
        process.exit(1);
      }
      
      // Build main application first
      this.log('\n==== Building Application ====\n', colors.blue);
      try {
        await execAsync('npm run build:main', {
          cwd: projectRoot,
          shell: '/bin/bash'
        });
        this.success('Application built successfully');
      } catch (error) {
        this.error('Failed to build application');
        this.error(`Build error: ${error}`);
        process.exit(1);
      }
      
      // Build daemon
      const daemonBuilt = await this.buildDaemon();
      if (!daemonBuilt) {
        this.warning('Failed to build daemon, attempting to continue...');
        // Check if daemon is already built
        const daemonPath = path.join(projectRoot, 'daemon', 'dist', 'host-bridge-daemon.js');
        if (!fs.existsSync(daemonPath)) {
          this.error('Daemon not built and build failed. Cannot continue.');
          process.exit(1);
        }
        this.info('Using existing daemon build');
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
      this.info('  View daemon logs: tail -f daemon/logs/host-bridge.log');
      this.info('  View Docker logs: npm run docker:logs');
      this.info('  Run tests: npm test');
      this.info('  Stop all: npm run stop')
      
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