#!/usr/bin/env node

/**
 * Project Setup Script
 * Handles all initial setup required to run the systemprompt-coding-agent
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
  blue: '\x1b[34m'
};

class ProjectSetup {
  private errors: string[] = [];
  
  private log(message: string, color: string = colors.reset): void {
    console.log(`${color}${message}${colors.reset}`);
  }
  
  private header(title: string): void {
    this.log(`\n==== ${title} ====\n`, colors.green);
  }
  
  private success(message: string): void {
    this.log(`✓ ${message}`, colors.green);
  }
  
  private error(message: string): void {
    this.log(`ERROR: ${message}`, colors.red);
    this.errors.push(message);
  }
  
  private warning(message: string): void {
    this.log(`WARNING: ${message}`, colors.yellow);
  }
  
  private info(message: string): void {
    this.log(`ℹ ${message}`, colors.blue);
  }
  
  private checkCommand(command: string): string | null {
    try {
      const result = execSync(`which ${command}`, { encoding: 'utf8' }).trim();
      return result || null;
    } catch {
      return null;
    }
  }
  
  private execCommand(command: string, cwd?: string): boolean {
    try {
      execSync(command, { 
        cwd: cwd || projectRoot,
        stdio: 'inherit'
      });
      return true;
    } catch {
      return false;
    }
  }
  
  async checkNodeVersion(): Promise<boolean> {
    this.header('Checking Node.js version');
    
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    if (majorVersion < 18) {
      this.error(`Node.js 18+ is required. Current version: ${nodeVersion}`);
      return false;
    }
    
    this.success(`Node.js ${nodeVersion} found`);
    return true;
  }
  
  async checkDocker(): Promise<boolean> {
    this.header('Checking Docker');
    
    const dockerPath = this.checkCommand('docker');
    const dockerComposePath = this.checkCommand('docker-compose');
    
    if (!dockerPath) {
      this.warning('Docker not found. You can still use the daemon mode.');
      return false;
    }
    
    if (!dockerComposePath) {
      this.error('docker-compose not found. Please install docker-compose.');
      return false;
    }
    
    this.success('Docker and docker-compose found');
    return true;
  }
  
  async checkClaude(): Promise<{ path: string | null; available: boolean }> {
    this.header('Checking Claude CLI');
    
    const claudePath = this.checkCommand('claude');
    
    if (!claudePath) {
      this.warning('Claude CLI not found. Install from: https://github.com/anthropics/claude-cli');
      return { path: null, available: false };
    }
    
    // Test if Claude actually works
    try {
      execSync(`${claudePath} --version`, { 
        timeout: 5000,
        stdio: 'pipe'
      });
      this.success(`Claude CLI found at: ${claudePath}`);
      return { path: claudePath, available: true };
    } catch {
      this.warning(`Claude found at ${claudePath} but not working properly`);
      return { path: claudePath, available: false };
    }
  }
  
  async checkCloudflared(): Promise<boolean> {
    this.header('Checking Cloudflare Tunnel (cloudflared)');
    
    const cloudflaredPath = this.checkCommand('cloudflared');
    
    if (!cloudflaredPath) {
      this.info('Cloudflared not found. Installing...');
      
      // Detect OS and install cloudflared
      const platform = process.platform;
      const arch = process.arch;
      
      try {
        if (platform === 'darwin') {
          // macOS
          if (this.checkCommand('brew')) {
            this.execCommand('brew install cloudflared');
          } else {
            this.error('Please install Homebrew first or manually install cloudflared');
            return false;
          }
        } else if (platform === 'linux') {
          // Linux
          const downloadUrl = arch === 'arm64' 
            ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64'
            : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
          
          // Try without sudo first (for environments where user has write access)
          if (!this.execCommand(`wget -q ${downloadUrl} -O /usr/local/bin/cloudflared 2>/dev/null`)) {
            // If that fails, try with sudo
            this.info('Attempting installation with sudo...');
            this.execCommand(`sudo wget -q ${downloadUrl} -O /usr/local/bin/cloudflared`);
            this.execCommand('sudo chmod +x /usr/local/bin/cloudflared');
          } else {
            this.execCommand('chmod +x /usr/local/bin/cloudflared');
          }
        } else if (platform === 'win32') {
          this.error('Windows detected. Please install cloudflared manually from https://github.com/cloudflare/cloudflared/releases');
          return false;
        }
        
        // Verify installation
        if (this.checkCommand('cloudflared')) {
          this.success('Cloudflared installed successfully');
          return true;
        }
      } catch (error) {
        this.warning('Failed to install cloudflared automatically. Please install manually.');
        this.info('Visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/');
        return false;
      }
    } else {
      this.success(`Cloudflared found at: ${cloudflaredPath}`);
      return true;
    }
    
    return false;
  }
  
  async createDirectories(): Promise<void> {
    this.header('Creating project directories');
    
    const dirs = ['logs', '.tmp', 'e2e-test/results'];
    
    for (const dir of dirs) {
      const fullPath = path.join(projectRoot, dir);
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    this.success('Directories created');
  }
  
  async installDependencies(): Promise<boolean> {
    this.header('Installing project dependencies');
    
    // Main dependencies
    if (!this.execCommand('npm install --no-audit --no-fund')) {
      this.error('Failed to install main dependencies');
      return false;
    }
    this.success('Main dependencies installed');
    
    // Daemon dependencies
    this.header('Installing daemon dependencies');
    if (!this.execCommand('npm install --no-audit --no-fund', path.join(projectRoot, 'daemon'))) {
      this.error('Failed to install daemon dependencies');
      return false;
    }
    this.success('Daemon dependencies installed');
    
    // E2E test dependencies
    this.header('Installing E2E test dependencies');
    if (!this.execCommand('npm install --no-audit --no-fund', path.join(projectRoot, 'e2e-test'))) {
      this.error('Failed to install E2E test dependencies');
      return false;
    }
    this.success('E2E test dependencies installed');
    
    return true;
  }
  
  async buildProject(): Promise<boolean> {
    this.header('Building TypeScript projects');
    
    // Build main project
    if (!this.execCommand('npm run build')) {
      this.error('Failed to build main project');
      return false;
    }
    
    // Build daemon
    if (!this.execCommand('npm run build', path.join(projectRoot, 'daemon'))) {
      this.error('Failed to build daemon');
      return false;
    }
    
    // Build scripts
    if (!this.execCommand('npm run build:scripts')) {
      this.error('Failed to build scripts');
      return false;
    }
    
    this.success('All TypeScript projects built');
    return true;
  }
  
  async createEnvironmentFile(claudePath: string | null, claudeAvailable: boolean, cloudflaredAvailable: boolean): Promise<void> {
    this.header('Setting up environment');
    
    const envPath = path.join(projectRoot, '.env');
    
    if (fs.existsSync(envPath)) {
      this.warning('.env file already exists, skipping');
      return;
    }
    
    const shellPath = this.checkCommand('bash') || '/bin/bash';
    const hostFileRoot = projectRoot;
    
    const envContent = `# Environment configuration for systemprompt-coding-agent

# Claude configuration
CLAUDE_PATH=${claudePath || ''}
CLAUDE_AVAILABLE=${claudeAvailable}
SHELL_PATH=${shellPath}

# Daemon configuration
CLAUDE_PROXY_HOST=host.docker.internal
CLAUDE_PROXY_PORT=9876

# MCP Server configuration
MCP_PORT=3000
HOST_FILE_ROOT=${hostFileRoot}

# Tunnel configuration
TUNNEL_ENABLED=${cloudflaredAvailable}
TUNNEL_PROVIDER=cloudflare
# TUNNEL_URL will be dynamically set when tunnel starts

# Optional: Anthropic API key (if not using daemon)
# ANTHROPIC_API_KEY=your-key-here

# Logging
LOG_LEVEL=info
`;
    
    fs.writeFileSync(envPath, envContent);
    this.success('Created .env file');
  }
  
  async run(): Promise<void> {
    this.header('System Prompt Coding Agent Setup');
    
    // Check Node.js
    if (!await this.checkNodeVersion()) {
      process.exit(1);
    }
    
    // Check Docker
    const dockerAvailable = await this.checkDocker();
    
    // Check Claude
    const claude = await this.checkClaude();
    
    // Check Cloudflared
    const cloudflaredAvailable = await this.checkCloudflared();
    
    // Create directories
    await this.createDirectories();
    
    // Install dependencies
    if (!await this.installDependencies()) {
      this.error('Failed to install dependencies');
      process.exit(1);
    }
    
    // Build projects
    if (!await this.buildProject()) {
      this.error('Failed to build projects');
      process.exit(1);
    }
    
    // Create environment file
    await this.createEnvironmentFile(claude.path, claude.available, cloudflaredAvailable);
    
    // Final summary
    this.header('Setup Complete!');
    
    if (this.errors.length > 0) {
      this.warning('\nSome issues were encountered:');
      this.errors.forEach(err => this.error(`  - ${err}`));
    }
    
    this.info('\nQuick start commands:');
    this.success('  npm start          # Start all services');
    this.success('  npm run tunnel     # Start services with internet tunnel');
    this.success('  npm test           # Run all tests');
    this.success('  npm run logs       # View logs');
    
    if (!claude.available) {
      this.warning('\nNote: Claude CLI is not available. The daemon will not work.');
      this.warning('Install Claude CLI to enable full functionality.');
    }
    
    if (cloudflaredAvailable) {
      this.success('\n✨ Cloudflare tunnel is available! Use "npm run tunnel" to expose your server.');
    }
  }
}

// Main entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const setup = new ProjectSetup();
  setup.run().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}