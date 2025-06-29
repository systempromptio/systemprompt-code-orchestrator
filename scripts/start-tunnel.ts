#!/usr/bin/env node

/**
 * @file Start services with Cloudflare tunnel
 * @module scripts/start-tunnel
 * 
 * @remarks
 * This script starts the MCP server with a public tunnel URL via Cloudflare
 */

import { spawn, execSync } from 'child_process';
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
  cyan: '\x1b[36m'
};

class TunnelStarter {
  private tunnelProcess: any = null;
  private tunnelUrl: string | null = null;
  
  private log(message: string, color: string = colors.reset): void {
    console.log(`${color}${message}${colors.reset}`);
  }
  
  private error(message: string): void {
    this.log(`❌ ${message}`, colors.red);
  }
  
  private success(message: string): void {
    this.log(`✅ ${message}`, colors.green);
  }
  
  private info(message: string): void {
    this.log(`ℹ️  ${message}`, colors.blue);
  }
  
  private warning(message: string): void {
    this.log(`⚠️  ${message}`, colors.yellow);
  }
  
  private checkCloudflared(): boolean {
    try {
      execSync('which cloudflared', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
  
  async startTunnel(): Promise<string> {
    return new Promise((resolve, reject) => {
      const port = process.env.PORT || '3000';
      
      this.info(`Starting Cloudflare tunnel on port ${port}...`);
      
      // Start cloudflared tunnel
      this.tunnelProcess = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      // Capture stdout
      this.tunnelProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        output += text;
        
        // Look for the tunnel URL in the output
        const urlMatch = text.match(/https:\/\/[^\s]+\.trycloudflare\.com/);
        if (urlMatch && !this.tunnelUrl) {
          this.tunnelUrl = urlMatch[0];
          this.success(`Tunnel established: ${this.tunnelUrl}`);
          resolve(this.tunnelUrl);
        }
      });
      
      // Capture stderr
      this.tunnelProcess.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        errorOutput += text;
        
        // Cloudflared outputs URL to stderr sometimes
        const urlMatch = text.match(/https:\/\/[^\s]+\.trycloudflare\.com/);
        if (urlMatch && !this.tunnelUrl) {
          this.tunnelUrl = urlMatch[0];
          this.success(`Tunnel established: ${this.tunnelUrl}`);
          resolve(this.tunnelUrl);
        }
      });
      
      this.tunnelProcess.on('error', (error: Error) => {
        this.error(`Failed to start tunnel: ${error.message}`);
        reject(error);
      });
      
      this.tunnelProcess.on('close', (code: number) => {
        if (code !== 0 && !this.tunnelUrl) {
          this.error(`Tunnel process exited with code ${code}`);
          reject(new Error(`Tunnel exited with code ${code}`));
        }
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this.tunnelUrl) {
          this.error('Timeout waiting for tunnel URL');
          if (this.tunnelProcess) {
            this.tunnelProcess.kill();
          }
          reject(new Error('Timeout waiting for tunnel URL'));
        }
      }, 30000);
    });
  }
  
  saveTunnelUrl(url: string): void {
    // Save to a file for other processes to read
    const tunnelFile = path.join(projectRoot, '.tunnel-url');
    fs.writeFileSync(tunnelFile, url);
    
    // Also save to logs directory
    const logsDir = path.join(projectRoot, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    fs.writeFileSync(path.join(logsDir, 'tunnel-url.txt'), url);
    
    this.info(`Tunnel URL saved to: ${tunnelFile}`);
  }
  
  updateEnvironment(url: string): void {
    // Update environment for child processes
    process.env.TUNNEL_URL = url;
    process.env.TUNNEL_ENABLED = 'true';
    process.env.PUBLIC_URL = url;
    
    // Update .env file if it exists
    const envPath = path.join(projectRoot, '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Add or update TUNNEL_URL
      if (envContent.includes('TUNNEL_URL=')) {
        envContent = envContent.replace(/TUNNEL_URL=.*/g, `TUNNEL_URL=${url}`);
      } else {
        envContent += `\n# Dynamically set by tunnel script\nTUNNEL_URL=${url}\n`;
      }
      
      fs.writeFileSync(envPath, envContent);
      this.info('Updated .env file with tunnel URL');
    }
  }
  
  async startServices(): Promise<void> {
    this.info('Starting all services with tunnel enabled...');
    
    // Run the start-all script directly
    const startAllPath = path.join(projectRoot, 'scripts', 'start-all.js');
    
    // Use spawn to run start-all with tunnel environment
    const startProcess = spawn('node', [startAllPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        TUNNEL_URL: this.tunnelUrl || '',
        TUNNEL_ENABLED: 'true',
        PUBLIC_URL: this.tunnelUrl || ''
      }
    });
    
    startProcess.on('error', (error: Error) => {
      this.error(`Failed to start services: ${error.message}`);
      process.exit(1);
    });
    
    startProcess.on('exit', (code: number | null) => {
      if (code !== 0) {
        this.error(`Start-all process exited with code ${code}`);
        process.exit(code || 1);
      }
    });
  }
  
  async run(): Promise<void> {
    try {
      // Check if cloudflared is installed
      if (!this.checkCloudflared()) {
        this.error('cloudflared not found. Please run "npm run setup" first.');
        process.exit(1);
      }
      
      // Start the tunnel
      const tunnelUrl = await this.startTunnel();
      
      // Save tunnel URL
      this.saveTunnelUrl(tunnelUrl);
      
      // Update environment
      this.updateEnvironment(tunnelUrl);
      
      // Display tunnel info
      console.log('\n' + '='.repeat(60));
      this.success('🌍 Your server is now accessible from the internet!');
      this.info(`🔗 Public URL: ${colors.cyan}${tunnelUrl}${colors.reset}`);
      this.info(`📡 MCP Endpoint: ${colors.cyan}${tunnelUrl}/mcp${colors.reset}`);
      console.log('='.repeat(60) + '\n');
      
      // Start services
      await this.startServices();
      
      // Handle shutdown
      process.on('SIGINT', () => {
        this.warning('\nShutting down tunnel...');
        if (this.tunnelProcess) {
          this.tunnelProcess.kill();
        }
        
        // Clean up tunnel URL file
        const tunnelFile = path.join(projectRoot, '.tunnel-url');
        if (fs.existsSync(tunnelFile)) {
          fs.unlinkSync(tunnelFile);
        }
        
        process.exit(0);
      });
      
    } catch (error) {
      this.error(`Failed to start tunnel: ${error}`);
      process.exit(1);
    }
  }
}

// Main entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const starter = new TunnelStarter();
  starter.run().catch(error => {
    console.error('Failed to start tunnel:', error);
    process.exit(1);
  });
}

export { TunnelStarter };